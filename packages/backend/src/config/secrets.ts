// src/config/secrets.ts

export async function loadSecrets(): Promise<void> {
  const nodeEnv = process.env.NODE_ENV;
  const isRender = process.env.RENDER;

  if (nodeEnv === 'development' || nodeEnv === 'test') {
    console.log('🔧 Development mode - using local .env file');
    return;
  }

  if (isRender) {
    console.log('🚀 Render platform detected - using Render environment variables');
    console.log('   All secrets managed through Render dashboard');
    
    // Validate that critical environment variables are present
    const requiredVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'STRIPE_SECRET_KEY',
      'FRONTEND_URL'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables in Render: ${missingVars.join(', ')}`);
    }

    console.log('✅ All required environment variables are present');
    return;
  }

  // For other platforms, ensure critical variables are set
  console.log('🌐 Using system environment variables');
  const requiredVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'FRONTEND_URL'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}
