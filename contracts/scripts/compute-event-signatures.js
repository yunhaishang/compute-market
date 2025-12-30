const { ethers } = require("hardhat");

async function main() {
    console.log("\n=== Computing Event Signatures ===\n");
    
    // TaskCreated 事件签名
    const taskCreatedSig = ethers.id("TaskCreated(uint256,uint256,address,uint256,uint256)");
    console.log("TaskCreated event signature:");
    console.log(taskCreatedSig);
    
    // TaskCompleted 事件签名
    const taskCompletedSig = ethers.id("TaskCompleted(uint256,uint256,address,string,uint256)");
    console.log("\nTaskCompleted event signature:");
    console.log(taskCompletedSig);
    
    // ServiceRegistered 事件签名
    const serviceRegisteredSig = ethers.id("ServiceRegistered(uint256,uint256,address)");
    console.log("\nServiceRegistered event signature:");
    console.log(serviceRegisteredSig);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
