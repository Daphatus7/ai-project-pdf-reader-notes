/**
 * @file        interceptors.ts
 * @description
 *
 * @author      [Peiyu Wang]
 * @created    Sunday
 * @license     © 2026 . All rights reserved.
 */

//  3. 认证拦截器（可选但推荐）
// 
//   位置：src/frontend/api/core/interceptors.ts
// 
//   功能：
//   - 自动在请求头添加 Authorization: Bearer ${token}
//   - 处理 401 错误，自动刷新 token
//   - Token 过期时自动重试请求
// 
//   或者：直接修改 api/core/client.ts 的 request() 函数，添加：
//   - 从 localStorage 读取 token
//   - 自动添加到请求头
//   - 处理认证失败