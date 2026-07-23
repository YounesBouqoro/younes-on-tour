const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || '';
const isGithub = process.env.GITHUB_ACTIONS === 'true';
const basePath = isGithub && repo ? `/${repo}` : '';
export default { output:'export', trailingSlash:true, images:{unoptimized:true}, basePath, assetPrefix:basePath };
