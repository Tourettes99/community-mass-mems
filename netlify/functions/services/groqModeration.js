const { Groq } = require("groq-sdk");
const chalk = require('chalk');

class GroqModerationService {
  constructor() {
    this.groq = null;
    this.model = "mixtral-8x7b-32768";  // Updated to latest supported model
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY environment variable is not set');
      }
      
      // Initialize Groq client with API key
      this.groq = new Groq({
        apiKey: process.env.GROQ_API_KEY
      });

      // Test the connection without moderation
      const testCompletion = await this.groq.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: "test" }],
        temperature: 0.1,
        max_tokens: 10
      });

      if (!testCompletion?.choices?.[0]?.message) {
        throw new Error('Failed to connect to Groq API');
      }

      this.initialized = true;
      console.log(chalk.green('✓ Groq moderation service initialized'));
    } catch (error) {
      console.error(chalk.red('Error initializing Groq moderation service:'), error);
      this.groq = null;
      this.initialized = false;
      throw error;
    }
  }

  async moderateContent(text, type = 'text') {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (!this.groq) {
        throw new Error('Groq client not initialized');
      }

      console.log(chalk.blue('Sending request to Groq API...'));
      console.log(chalk.cyan('Content to moderate:'), { type, text: text?.substring(0, 100) + (text?.length > 100 ? '...' : '') });

      const tools = [{
        type: "function",
        function: {
          name: "content_moderation",
          description: "Analyze content for inappropriate or harmful material",
          parameters: {
            type: "object",
            properties: {
              content: {
                type: "string",
                description: "The content to analyze"
              },
              content_type: {
                type: "string",
                enum: ["text", "url"],
                description: "The type of content being analyzed"
              }
            },
            required: ["content", "content_type"]
          }
        }
      }];

      const messages = [
        {
          role: "system",
          content: `You are a content moderation assistant. Analyze the following ${type} content for inappropriate or harmful material. ${
            type === 'url' ? 
            'Pay special attention to the URL structure, domain reputation, and potential phishing or malicious indicators.' :
            'Consider hate speech, harassment, sexual content, violence, self-harm, and spam.'
          } Rate each category from 0 to 1, where 0 is safe and 1 is extreme violation. Be strict but fair in your assessment.`
        },
        {
          role: "user",
          content: text || ''  // Ensure text is never undefined
        }
      ];

      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.1,
        max_tokens: 1000,
        top_p: 1,
        stream: false
      });

      if (!completion?.choices?.[0]?.message?.tool_calls?.[0]) {
        console.error(chalk.red('Invalid Groq API response:'), JSON.stringify(completion, null, 2));
        throw new Error('No moderation result received from Groq API');
      }

      const toolCall = completion.choices[0].message.tool_calls[0];
      let result;
      
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch (error) {
        console.error(chalk.red('Error parsing Groq API response:'), error);
        console.error(chalk.red('Raw response:'), toolCall.function.arguments);
        throw new Error('Invalid response format from Groq API');
      }

      // Process the moderation response
      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          ...messages,
          {
            role: "assistant",
            content: "Let me analyze this content for any inappropriate or harmful material.",
            tool_calls: [{
              id: "call_1",
              type: "function",
              function: {
                name: "content_moderation",
                arguments: JSON.stringify({
                  content: text,
                  content_type: type
                })
              }
            }]
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const analysis = response.choices[0].message.content;
      
      // Parse the analysis to determine if content is appropriate
      // Look for actual indicators of inappropriate content, not just the words in the analysis
      const isInappropriate = (
        analysis.toLowerCase().includes('contains inappropriate') ||
        analysis.toLowerCase().includes('contains harmful') ||
        analysis.toLowerCase().includes('contains offensive') ||
        analysis.toLowerCase().includes('rating: 1') ||
        /\b[4-9]\/10\b/.test(analysis) ||  // Matches ratings 4-9 out of 10
        /\b10\/10\b/.test(analysis)     // Matches 10/10
      ) && !analysis.toLowerCase().includes('rating: 0') &&
          !analysis.toLowerCase().includes('safe and appropriate');

      console.log(chalk.yellow('\nModeration Analysis:'));
      console.log(chalk.cyan('Content Type:'), type);
      console.log(chalk.cyan('Analysis:'), analysis);

      return {
        flagged: isInappropriate,
        category_scores: {
          inappropriate: isInappropriate ? 1 : 0
        },
        reason: isInappropriate ? analysis : null
      };
    } catch (error) {
      console.error(chalk.red('Error calling Groq API:'), error);
      throw error;
    }
  }
}

module.exports = new GroqModerationService();
