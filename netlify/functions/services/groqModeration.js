const { Groq } = require("groq-sdk");
const chalk = require('chalk');

class GroqModerationService {
  constructor() {
    this.groq = null;
    this.model = "llama3-groq-70b-8192-tool-use-preview";  // Updated to correct model name
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
              is_appropriate: {
                type: "boolean",
                description: "Whether the content is appropriate and safe"
              },
              category_scores: {
                type: "object",
                properties: {
                  hate: { type: "number" },
                  harassment: { type: "number" },
                  sexual: { type: "number" },
                  violence: { type: "number" },
                  self_harm: { type: "number" },
                  spam: { type: "number" },
                  malicious: { type: "number", description: "Score for potentially malicious URLs or content" }
                }
              },
              reason: {
                type: "string",
                description: "Explanation for why content was flagged (if inappropriate)"
              }
            },
            required: ["is_appropriate", "category_scores"]
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

      if (!result || typeof result.is_appropriate !== 'boolean' || !result.category_scores) {
        console.error(chalk.red('Invalid result format:'), result);
        throw new Error('Invalid moderation result format');
      }

      // Ensure category_scores are numbers
      if (result.category_scores) {
        Object.entries(result.category_scores).forEach(([key, value]) => {
          result.category_scores[key] = typeof value === 'number' ? value : parseFloat(value) || 0;
        });
      }

      console.log(chalk.yellow('\nModeration Analysis:'));
      console.log(chalk.cyan('Content Type:'), type);
      console.log(chalk.cyan('Is Appropriate:'), result.is_appropriate);
      console.log(chalk.cyan('Category Scores:'), JSON.stringify(result.category_scores, null, 2));

      if (!result.is_appropriate && result.reason) {
        console.log(chalk.cyan('Reason:'), chalk.red(result.reason));
      }

      return {
        flagged: !result.is_appropriate,
        category_scores: result.category_scores,
        reason: result.reason || null
      };
    } catch (error) {
      console.error(chalk.red('Error calling Groq API:'), error);
      throw error;
    }
  }
}

module.exports = new GroqModerationService();
