// Moderation error categories with user-friendly descriptions
const ModerationCategories = {
  HATE: {
    code: 'M001',
    name: 'Hate Speech',
    description: 'Content that expresses, incites, or promotes hate based on identity',
    userMessage: 'Your content was flagged for hate speech. We aim to create a respectful environment for all users. Please revise your content to be more inclusive and respectful.'
  },
  HARASSMENT: {
    code: 'M002',
    name: 'Harassment',
    description: 'Content that harasses, intimidates, or bullies individuals or groups',
    userMessage: 'Your content was flagged for harassment. We want everyone to feel safe in our community. Please ensure your content doesn\'t target or harass others.'
  },
  VIOLENCE: {
    code: 'M003',
    name: 'Violence',
    description: 'Content that promotes or glorifies violence',
    userMessage: 'Your content was flagged for violent content. We don\'t allow content that promotes or describes graphic violence. Please revise your submission.'
  },
  SELF_HARM: {
    code: 'M004',
    name: 'Self-Harm',
    description: 'Content that promotes, encourages, or depicts acts of self-harm',
    userMessage: 'Your content was flagged for self-harm related content. If you\'re struggling, please reach out for help. National Crisis Hotline: 988'
  },
  SEXUAL: {
    code: 'M005',
    name: 'Sexual Content',
    description: 'Content that contains explicit sexual content',
    userMessage: 'Your content was flagged for explicit material. Please keep content family-friendly and appropriate for all audiences.'
  },
  THREATENING: {
    code: 'M006',
    name: 'Threatening Content',
    description: 'Content that expresses intentions to harm or incites violence',
    userMessage: 'Your content was flagged for threatening language. We take threats seriously and don\'t allow content that expresses intentions to harm others.'
  }
};

// Helper function to create user-friendly moderation error response
function createModerationError(categories, scores) {
  // Find the highest scoring violation categories
  const violations = Object.entries(scores)
    .filter(([category, score]) => score > 0.5) // Threshold for considering it a violation
    .sort(([, a], [, b]) => b - a); // Sort by score descending

  if (violations.length === 0) {
    return {
      code: 'M000',
      message: 'Content flagged by moderation system',
      userMessage: 'Your content was flagged by our moderation system. Please review our content guidelines and try again.',
      categories: [],
      scores: scores
    };
  }

  // Get the primary violation (highest score)
  const [primaryCategory] = violations[0];
  const mainViolation = getPrimaryViolation(primaryCategory);

  // Build detailed response
  const response = {
    code: mainViolation.code,
    message: mainViolation.name,
    userMessage: buildUserMessage(violations),
    categories: violations.map(([category]) => category),
    scores: scores,
    details: violations.map(([category, score]) => ({
      category,
      score: Math.round(score * 100) / 100,
      description: ModerationCategories[getCategoryKey(category)]?.description
    }))
  };

  // Add help resources if applicable
  const helpResources = getHelpResources(violations.map(([category]) => category));
  if (helpResources) {
    response.helpResources = helpResources;
  }

  return response;
}

// Helper function to get the primary violation info
function getPrimaryViolation(category) {
  const key = getCategoryKey(category);
  return ModerationCategories[key] || {
    code: 'M999',
    name: 'Content Policy Violation',
    description: 'Content that violates our community guidelines'
  };
}

// Helper function to build a user-friendly message based on violations
function buildUserMessage(violations) {
  if (violations.length === 1) {
    const [category] = violations[0];
    const key = getCategoryKey(category);
    return ModerationCategories[key]?.userMessage || 
      'Your content was flagged by our moderation system. Please review our content guidelines.';
  }

  // Multiple violations
  const categories = violations
    .map(([category]) => ModerationCategories[getCategoryKey(category)]?.name)
    .filter(Boolean)
    .join(' and ');

  return `Your content was flagged for ${categories}. Please review our content guidelines and ensure your submission meets our community standards.`;
}

// Helper function to get relevant help resources based on violation categories
function getHelpResources(categories) {
  const resources = [];

  if (categories.some(cat => cat.includes('self-harm'))) {
    resources.push({
      name: 'National Crisis Hotline',
      contact: '988',
      description: '24/7 support for anyone in crisis',
      url: 'https://988lifeline.org/'
    });
  }

  if (categories.some(cat => cat.includes('hate') || cat.includes('harassment'))) {
    resources.push({
      name: 'Stop Bullying',
      description: 'Resources for preventing and addressing bullying',
      url: 'https://www.stopbullying.gov/'
    });
  }

  return resources.length > 0 ? resources : null;
}

// Helper function to convert OpenAI category names to our category keys
function getCategoryKey(category) {
  const mapping = {
    'hate/threatening': 'THREATENING',
    'self-harm/intent': 'SELF_HARM',
    'self-harm/instructions': 'SELF_HARM',
    'harassment/threatening': 'HARASSMENT',
    'violence/graphic': 'VIOLENCE'
  };

  // First check the mapping for compound categories
  if (mapping[category]) {
    return mapping[category];
  }

  // Then try to match the base category
  const baseCategory = category.split('/')[0].toUpperCase();
  return Object.keys(ModerationCategories).includes(baseCategory) ? baseCategory : null;
}

// Helper function to log moderation decisions for analysis
function logModerationDecision(content, result, context = {}) {
  const decision = {
    timestamp: new Date().toISOString(),
    contentPreview: typeof content === 'string' ? content.slice(0, 100) : 'NON_TEXT_CONTENT',
    contentType: context.type || 'unknown',
    moderationResult: result,
    requestId: context.requestId,
    userId: context.userId
  };

  // Log to console (in production this might go to a logging service)
  console.log('[MODERATION_DECISION]', JSON.stringify(decision, null, 2));

  return decision;
}

module.exports = {
  ModerationCategories,
  createModerationError,
  logModerationDecision
};
