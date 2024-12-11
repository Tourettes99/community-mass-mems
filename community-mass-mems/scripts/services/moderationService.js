const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const dotenv = require('dotenv');

// Load environment variables from the correct path
const envPath = path.join(__dirname, '..', '..', '..', 'community-mass-mems', '.env');
dotenv.config({ path: envPath });

class ModerationService {
  constructor() {
    this.rules = null;
    this.knowledgeBase = null;
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    
    // Clean up the API key if it has any extra text
    if (this.openaiApiKey) {
      this.openaiApiKey = this.openaiApiKey.trim();
      // Remove any text after the key if present
      if (this.openaiApiKey.includes(' ')) {
        this.openaiApiKey = this.openaiApiKey.split(' ')[0];
      }
    }

    if (!this.openaiApiKey) {
      console.error(chalk.red('OPENAI_API_KEY is not set in environment variables'));
      process.exit(1);
    }

    // Verify it's a project API key
    if (!this.openaiApiKey.startsWith('sk-proj-')) {
      console.error(chalk.red('Invalid OpenAI API key format. Must be a project API key (starts with sk-proj-)'));
      process.exit(1);
    }
  }

  async initialize() {
    try {
      const configPath = path.join(__dirname, '..', '..', 'config', 'moderation-rules.json');
      const configData = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);
      this.rules = config.rules;
      this.knowledgeBase = config.knowledge_base;
      this.settings = config.moderation_settings;

      // Test the OpenAI API key with the moderation endpoint
      try {
        await this.checkOpenAIModeration('test');
        console.log(chalk.green('✓ OpenAI API key verified'));
      } catch (error) {
        if (error.message.includes('invalid_api_key')) {
          console.error(chalk.red('Error: Invalid API key. Make sure you have enabled the Moderation API in your OpenAI project settings.'));
          console.log(chalk.yellow('Visit https://platform.openai.com/projects to configure your project.'));
        } else {
          console.error(chalk.red('Error verifying OpenAI API key:'), error.message);
        }
        console.log(chalk.yellow('API Key format:'), this.openaiApiKey.substring(0, 15) + '...');
        throw error;
      }

      console.log(chalk.green('✓ Moderation service initialized'));
    } catch (error) {
      console.error(chalk.red('Error initializing moderation service:'), error);
      throw error;
    }
  }

  async checkOpenAIModeration(text) {
    try {
      console.log(chalk.blue('Sending request to OpenAI moderation API...'));
      const response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          input: text
        })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error(chalk.red('Error parsing API response:'), responseText);
        throw new Error('Invalid response from OpenAI API');
      }

      if (!response.ok) {
        console.error(chalk.red('OpenAI API error response:'), data);
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      return data.results[0];
    } catch (error) {
      console.error(chalk.red('Error calling OpenAI moderation API:'), error);
      throw error;
    }
  }

  async moderateContent(content, type) {
    console.log(chalk.blue('\nAnalyzing content...'));
    
    // Check content against OpenAI moderation
    const openAIResult = await this.checkOpenAIModeration(
      type === 'text' ? content : content.url || content.content
    );

    // Format OpenAI results
    const categories = Object.entries(openAIResult.categories)
      .filter(([_, flagged]) => flagged)
      .map(([category]) => category);

    const scores = Object.entries(openAIResult.category_scores)
      .map(([category, score]) => ({
        category,
        score: Math.round(score * 100) / 100
      }))
      .sort((a, b) => b.score - a.score);

    // Display real-time analysis
    console.log(chalk.yellow('\nModeration Analysis:'));
    if (categories.length > 0) {
      console.log(chalk.red('Flagged Categories:'));
      categories.forEach(category => {
        console.log(chalk.red(`  • ${category}`));
      });
    } else {
      console.log(chalk.green('No categories flagged'));
    }

    console.log(chalk.yellow('\nCategory Scores:'));
    scores.forEach(({ category, score }) => {
      const color = score > 0.8 ? 'red' : score > 0.5 ? 'yellow' : 'green';
      console.log(chalk[color](`  • ${category}: ${score}`));
    });

    // Check against custom rules
    const customViolations = [];
    if (this.knowledgeBase.custom_rules) {
      console.log(chalk.yellow('\nChecking custom rules...'));
      for (const rule of this.knowledgeBase.custom_rules) {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(type === 'text' ? content : content.url)) {
          customViolations.push(rule);
          console.log(chalk.red(`  • Matched rule: ${rule.reason}`));
        }
      }
    }

    // Make moderation decision
    const highestScore = Math.max(...Object.values(openAIResult.category_scores));
    let decision;
    let reason;

    if (highestScore >= this.settings.auto_reject_threshold || customViolations.length > 0) {
      decision = 'reject';
      reason = categories.length > 0 
        ? `Content violates rules: ${categories.join(', ')}` 
        : 'Content violates custom rules';
    } else if (highestScore <= this.settings.auto_approve_threshold && customViolations.length === 0) {
      decision = 'approve';
      reason = 'Content meets community guidelines';
    } else {
      decision = 'review';
      reason = 'Content requires human review';
    }

    console.log(chalk.yellow('\nRecommended Action:'));
    console.log(
      decision === 'approve' ? chalk.green(`  ${decision.toUpperCase()}: ${reason}`) :
      decision === 'reject' ? chalk.red(`  ${decision.toUpperCase()}: ${reason}`) :
      chalk.yellow(`  ${decision.toUpperCase()}: ${reason}`)
    );

    return {
      decision,
      reason,
      openAIResult,
      customViolations,
      requiresHumanReview: this.settings.require_human_review && decision !== 'approve'
    };
  }
}

module.exports = new ModerationService();
