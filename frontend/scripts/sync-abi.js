#!/usr/bin/env node

/**
 * 自动同步合约 ABI 脚本
 * 从 contracts/artifacts 复制编译后的 ABI 到前端 src/abis 目录
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定义路径
const CONTRACTS_DIR = path.resolve(__dirname, '../../contracts');
const ARTIFACTS_PATH = path.join(
  CONTRACTS_DIR,
  'artifacts/contracts/ComputeMarket.sol/ComputeMarket.json'
);
const FRONTEND_ABI_DIR = path.resolve(__dirname, '../src/abis');
const OUTPUT_PATH = path.join(FRONTEND_ABI_DIR, 'ComputeMarket.json');

console.log('🔄 开始同步智能合约 ABI...\n');

// 检查源文件是否存在
if (!fs.existsSync(ARTIFACTS_PATH)) {
  console.error('❌ 错误: 未找到合约编译产物!');
  console.error(`   路径: ${ARTIFACTS_PATH}`);
  console.error('\n💡 提示: 请先编译智能合约:');
  console.error('   cd contracts && npx hardhat compile\n');
  process.exit(1);
}

// 确保目标目录存在
if (!fs.existsSync(FRONTEND_ABI_DIR)) {
  fs.mkdirSync(FRONTEND_ABI_DIR, { recursive: true });
  console.log(`✅ 创建目录: ${FRONTEND_ABI_DIR}`);
}

try {
  // 读取完整的 artifacts 文件
  const artifactContent = fs.readFileSync(ARTIFACTS_PATH, 'utf8');
  const artifact = JSON.parse(artifactContent);

  // 提取需要的信息
  const abiData = {
    contractName: artifact.contractName,
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    deployedBytecode: artifact.deployedBytecode,
    // 保存完整的 artifact 便于后续使用
    _format: artifact._format,
    sourceName: artifact.sourceName
  };

  // 写入前端目录
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(abiData, null, 2), 'utf8');

  console.log('✅ ABI 同步成功!');
  console.log(`   源文件: ${ARTIFACTS_PATH}`);
  console.log(`   目标文件: ${OUTPUT_PATH}`);
  console.log(`\n📊 ABI 统计:`);
  console.log(`   - 合约名称: ${artifact.contractName}`);
  console.log(`   - 函数数量: ${artifact.abi.filter(item => item.type === 'function').length}`);
  console.log(`   - 事件数量: ${artifact.abi.filter(item => item.type === 'event').length}`);
  console.log(`   - 错误数量: ${artifact.abi.filter(item => item.type === 'error').length}`);
  console.log('\n✨ 完成!\n');

} catch (error) {
  console.error('❌ 同步失败:', error.message);
  process.exit(1);
}
