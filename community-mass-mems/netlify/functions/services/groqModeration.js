const { Groq } = require("groq-sdk");
const chalk = require('chalk');

class GroqModerationService {
  constructor() {
    this.groq = new Groq();
    this.model = "llama-3.1-70b-versatile";
  }

  async initialize() {
    try {
      if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY environment variable is not set');
      }
      
      // Test the API key with a simple request
      await this.moderateContent("test");
      console.log(chalk.green('✓ Groq moderation service initialized'));
    } catch (error) {
      console.error(chalk.red('Error initializing Groq moderation service:'), error);
      throw error;
    }
  }

  async moderateContent(text, type = 'text') {
    try {
      console.log(chalk.blue('Sending request to Groq API...'));

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
                  spam: { type: "number" }
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
          content: `You are a content moderation assistant. Analyze the following ${type} content for inappropriate or harmful material. Consider hate speech, harassment, sexual content, violence, self-harm, and spam. Rate each category from 0 to 1, where 0 is safe and 1 is extreme violation. Be strict but fair in your assessment.`
        },
        {
          role: "user",
          content: text
        }
      ];

      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.1,
        max_tokens: 1000
      });

      const response = completion.choices[0];
      
      if (!response.message.tool_calls) {
        throw new Error('No moderation result received from Groq API');
      }

      const toolCall = response.message.tool_calls[0];
      const result = JSON.parse(toolCall.function.arguments);

      // Ensure category_scores are numbers
      if (result.category_scores) {
        Object.entries(result.category_scores).forEach(([key, value]) => {
          result.category_scores[key] = typeof value === 'number' ? value : parseFloat(value) || 0;
        });
      }

      console.log(chalk.yellow('\nModeration Analysis:'));
      console.log(chalk.cyan('Content Type:'), type);
      console.log(chalk.cyan('Is Appropriate:'), result.is_appropriate);
      console.log(chalk.cyan('Category Scores:'));
      Object.entries(result.category_scores).forEach(([category, score]) => {
        const color = score > 0.7 ? chalk.red : score > 0.4 ? chalk.yellow : chalk.green;
        const scoreValue = typeof score === 'number' ? score.toFixed(3) : score;
        console.log(`  ${category}: ${color(scoreValue)}`);
      });

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
