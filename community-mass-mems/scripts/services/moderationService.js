const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

class ModerationService {
  constructor() {
    this.rules = null;
    this.knowledgeBase = null;
  }

  async initialize() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.error(chalk.red('OPENAI_API_KEY is not set in environment variables'));
        console.log(chalk.yellow('Available environment variables:'), Object.keys(process.env));
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }
      const configPath = path.join(__dirname, '..', '..', 'config', 'moderation-rules.json');
      const configData = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);
      this.rules = config.rules;
      this.knowledgeBase = config.knowledge_base;
      this.settings = config.moderation_settings;
      console.log(chalk.green('✓ Moderation service initialized'));
    } catch (error) {
      console.error(chalk.red('Error loading moderation rules:'), error);
      throw error;
    }
  }

  async checkOpenAIModeration(text) {
    try {
      const response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          input: text
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
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
