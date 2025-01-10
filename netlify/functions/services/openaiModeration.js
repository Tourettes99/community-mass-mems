const OpenAI = require('openai');
const chalk = require('chalk');

class OpenAIModerationService {
  constructor() {
    this.openai = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }
      
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      this.initialized = true;
      console.log(chalk.green('✓ OpenAI moderation service initialized'));
    } catch (error) {
      console.error(chalk.red('Error initializing OpenAI moderation service:'), error);
      this.openai = null;
      this.initialized = false;
      throw error;
    }
  }

  async moderateContent(text, type = 'text') {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      console.log(chalk.blue('Sending request to OpenAI Moderation API...'));
      console.log(chalk.cyan('Content to moderate:'), { type, text: text?.substring(0, 100) + (text?.length > 100 ? '...' : '') });

      // For URLs, we want to check both the URL and any metadata we can fetch
      let contentToCheck = text;
      if (type === 'url') {
        try {
          const response = await fetch(text);
          const html = await response.text();
          // Extract title and description from meta tags
          const title = html.match(/<title>(.*?)<\/title>/i)?.[1] || '';
          const description = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i)?.[1] || '';
          contentToCheck = `${text}\n${title}\n${description}`;
        } catch (error) {
          console.warn(chalk.yellow('Could not fetch URL metadata, moderating URL only'));
        }
      }

      const moderationResponse = await this.openai.moderations.create({
        input: contentToCheck
      });

      const result = moderationResponse.results[0];
      
      console.log(chalk.yellow('\nModeration Results:'));
      console.log(chalk.cyan('Content Type:'), type);
      console.log(chalk.cyan('Flagged:'), result.flagged);
      console.log(chalk.cyan('Categories:'), result.categories);
      console.log(chalk.cyan('Category Scores:'), result.category_scores);

      // Determine reason if flagged
      let reason = null;
      if (result.flagged) {
        reason = Object.entries(result.categories)
          .filter(([_, flagged]) => flagged)
          .map(([category]) => category.replace(/_/g, ' '))
          .join(', ');
      }

      return {
        flagged: result.flagged,
        category_scores: result.category_scores,
        categories: result.categories,
        reason: reason ? `Content flagged for: ${reason}` : null
      };
    } catch (error) {
      console.error(chalk.red('Error calling OpenAI Moderation API:'), error);
      throw error;
    }
  }
}

module.exports = new OpenAIModerationService();
