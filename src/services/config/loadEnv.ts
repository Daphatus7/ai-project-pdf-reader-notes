/**
 * 环境变量加载器
 * 在 React 应用中，环境变量由 Create React App 自动处理
 * 这个函数主要用于兼容性，不执行任何实际操作
 */
let envLoaded = false;

export const ensureEnv = (): void => {
  if (envLoaded) {
    return;
  }

  // 在 React 应用中，环境变量由 Create React App 自动处理
  // 我们只需要标记为已加载，不执行任何实际操作
  envLoaded = true;
  
  // 可选：记录环境变量状态（仅用于调试）
  if (process.env.NODE_ENV === 'development') {
    const hasOpenAI = Boolean(process.env.REACT_APP_OPENAI_API_KEY);
    const hasClaude = Boolean(process.env.REACT_APP_ANTHROPIC_API_KEY);
    const hasGemini = Boolean(process.env.REACT_APP_GOOGLE_API_KEY);
    
    console.log('Environment variables status:', {
      hasOpenAI,
      hasClaude,
      hasGemini,
      totalConfigured: [hasOpenAI, hasClaude, hasGemini].filter(Boolean).length
    });
  }
};

export default ensureEnv;
