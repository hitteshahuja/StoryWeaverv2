const LegalConfig = {
  companyName: 'AI DreamWeaver',
  legalEntity: 'AI DreamWeaver',
  contactEmail: 'hello@aidreamweaver.co.uk',
  dpoEmail: 'hello@aidreamweaver.co.uk',
  effectiveDate: '2 April 2026',
  jurisdiction: 'United Kingdom',
  supervisoryAuthority: 'Information Commissioner\'s Office (ICO)',
  website: 'https://www.aidreamweaver.co.uk',

  subProcessors: [
    { name: 'OpenAI', purpose: 'Text-to-speech, image generation, content moderation', location: 'USA', adequacy: 'SCCs' },
    { name: 'Google Gemini', purpose: 'Story generation, image analysis, feature extraction', location: 'USA', adequacy: 'SCCs' },
    { name: 'Portkey', purpose: 'AI gateway and load balancing', location: 'USA', adequacy: 'SCCs' },
    { name: 'Cloudflare R2', purpose: 'Persistent storage of AI-generated images and audio', location: 'EU (Frankfurt)', adequacy: 'Adequacy' },
    { name: 'Stripe', purpose: 'Payment processing', location: 'USA', adequacy: 'SCCs' },
    { name: 'Clerk', purpose: 'Authentication and identity management', location: 'USA', adequacy: 'SCCs' },
  ],

  dataCategories: [
    'Parent account details (name, email)',
    'Child first name and age (never full name or date of birth)',
    'Uploaded photographs (processed in-memory, deleted within 60 seconds)',
    'AI-generated story content',
    'AI-generated illustrations and audio',
    'Usage analytics (anonymised)',
  ],

  retentionPeriods: {
    accountData: 'Until account deletion',
    stories: 'Until user deletes or account is closed',
    aiImages: 'Until user deletes or account is closed',
    rawPhotos: '60 seconds in RAM — never persisted to disk',
    rawVoiceSamples: '60 seconds in RAM — never persisted to disk',
    billingRecords: '7 years (legal requirement)',
  },

  legalBases: {
    serviceDelivery: 'Performance of contract',
    aiImageProcessing: 'Explicit parental consent (GDPR Art. 6(1)(a) + Art. 8 COPPA)',
    aiVoiceProcessing: 'Explicit parental consent (GDPR Art. 6(1)(a) + Art. 8 COPPA)',
    billing: 'Legal obligation (tax/accounting)',
    analytics: 'Legitimate interest (service improvement)',
  },
};

export default LegalConfig;
