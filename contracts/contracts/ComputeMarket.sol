// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

/**
 * @title ComputeMarket
 * @notice 算力交易市场合约 - 负责资金托管、任务状态管理和事件触发
 */
contract ComputeMarket {
    // ============ 状态变量 ============
    
    /// @notice 任务状态枚举
    enum TaskStatus {
        Created,    // 已创建
        Running,    // 运行中
        Completed,  // 已完成
        Refunded    // 已退款
    }
    
    /// @notice 任务信息结构体
    struct Task {
        uint256 taskId;           // 任务ID
        uint256 serviceId;         // 服务ID
        address buyer;            // 购买者地址
        uint256 amount;            // 支付金额（wei）
        TaskStatus status;         // 任务状态
        string resultHash;         // 结果哈希（完成时设置）
        uint256 createdAt;         // 创建时间戳
        uint256 completedAt;       // 完成时间戳
    }
    
    /// @notice 服务信息结构体
    struct Service {
        uint256 serviceId;         // 服务ID
        uint256 price;             // 价格（wei）
        bool active;               // 是否激活
    }
    
    address public admin;          // 管理员地址
    uint256 private _taskCounter;   // 任务计数器
    
    mapping(uint256 => Task) public tasks;           // taskId => Task
    mapping(uint256 => Service) public services;    // serviceId => Service
    
    // ============ 事件 ============
    
    /// @notice 任务创建事件
    event TaskCreated(
        uint256 indexed taskId,
        uint256 indexed serviceId,
        address indexed buyer,
        uint256 amount,
        uint256 timestamp
    );
    
    /// @notice 任务完成事件
    event TaskCompleted(
        uint256 indexed taskId,
        uint256 indexed serviceId,
        address indexed buyer,
        string resultHash,
        uint256 timestamp
    );
    
    /// @notice 任务退款事件
    event TaskRefunded(
        uint256 indexed taskId,
        uint256 indexed serviceId,
        address indexed buyer,
        uint256 amount,
        uint256 timestamp
    );
    
    /// @notice 服务注册事件
    event ServiceRegistered(
        uint256 indexed serviceId,
        uint256 price,
        address indexed registrant
    );
    
    // ============ 修饰符 ============
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "ComputeMarket: caller is not admin");
        _;
    }
    
    modifier validService(uint256 serviceId) {
        require(services[serviceId].active, "ComputeMarket: service not active");
        _;
    }
    
    modifier validTask(uint256 taskId) {
        require(tasks[taskId].taskId != 0, "ComputeMarket: task does not exist");
        _;
    }
    
    // ============ 构造函数 ============
    
    constructor() {
        admin = msg.sender;
    }
    
    // ============ 核心功能 ============
    
    /**
     * @notice 购买算力服务
     * @param serviceId 服务ID
     */
    function buyCompute(uint256 serviceId) 
        external 
        payable 
        validService(serviceId)
    {
        Service memory service = services[serviceId];
        
        // 校验支付金额
        require(msg.value >= service.price, "ComputeMarket: insufficient payment");
        
        // 创建任务ID
        _taskCounter++;
        uint256 taskId = _taskCounter;
        
        // 存储任务信息
        tasks[taskId] = Task({
            taskId: taskId,
            serviceId: serviceId,
            buyer: msg.sender,
            amount: msg.value,
            status: TaskStatus.Created,
            resultHash: "",
            createdAt: block.timestamp,
            completedAt: 0
        });
        
        // 发出事件
        emit TaskCreated(
            taskId,
            serviceId,
            msg.sender,
            msg.value,
            block.timestamp
        );
    }
    
    /**
     * @notice 管理员标记任务为运行中
     * @param taskId 任务ID
     */
    function startTask(uint256 taskId) 
        external 
        onlyAdmin 
        validTask(taskId)
    {
        Task storage task = tasks[taskId];
        require(
            task.status == TaskStatus.Created,
            "ComputeMarket: task must be in Created status"
        );
        
        task.status = TaskStatus.Running;
    }
    
    /**
     * @notice 管理员完成任务并释放资金
     * @param taskId 任务ID
     * @param resultHash 计算结果哈希
     */
    function completeTask(uint256 taskId, string calldata resultHash) 
        external 
        onlyAdmin 
        validTask(taskId)
    {
        Task storage task = tasks[taskId];
        require(
            task.status == TaskStatus.Running || task.status == TaskStatus.Created,
            "ComputeMarket: task must be in Running or Created status"
        );
        
        // 更新状态
        task.status = TaskStatus.Completed;
        task.resultHash = resultHash;
        task.completedAt = block.timestamp;
        
        // 释放资金给服务提供者（这里简化处理，直接转给管理员）
        // 实际场景中，应该转给服务提供者地址
        (bool success, ) = admin.call{value: task.amount}("");
        require(success, "ComputeMarket: transfer failed");
        
        // 发出事件
        emit TaskCompleted(
            taskId,
            task.serviceId,
            task.buyer,
            resultHash,
            block.timestamp
        );
    }
    
    /**
     * @notice 管理员退款任务
     * @param taskId 任务ID
     */
    function refundTask(uint256 taskId) 
        external 
        onlyAdmin 
        validTask(taskId)
    {
        Task storage task = tasks[taskId];
        require(
            task.status == TaskStatus.Created || task.status == TaskStatus.Running,
            "ComputeMarket: task must be in Created or Running status"
        );
        
        // 更新状态
        task.status = TaskStatus.Refunded;
        
        // 退款给购买者
        (bool success, ) = task.buyer.call{value: task.amount}("");
        require(success, "ComputeMarket: refund failed");
        
        // 发出事件
        emit TaskRefunded(
            taskId,
            task.serviceId,
            task.buyer,
            task.amount,
            block.timestamp
        );
    }
    
    // ============ 管理员功能 ============
    
    /**
     * @notice 注册服务
     * @param serviceId 服务ID
     * @param price 价格（wei）
     */
    function registerService(uint256 serviceId, uint256 price) 
        external 
        onlyAdmin 
    {
        require(price > 0, "ComputeMarket: price must be greater than 0");
        require(!services[serviceId].active, "ComputeMarket: service already exists");
        
        services[serviceId] = Service({
            serviceId: serviceId,
            price: price,
            active: true
        });
        
        emit ServiceRegistered(serviceId, price, msg.sender);
    }
    
    /**
     * @notice 更新服务价格
     * @param serviceId 服务ID
     * @param newPrice 新价格（wei）
     */
    function updateServicePrice(uint256 serviceId, uint256 newPrice) 
        external 
        onlyAdmin 
        validService(serviceId)
    {
        require(newPrice > 0, "ComputeMarket: price must be greater than 0");
        services[serviceId].price = newPrice;
    }
    
    /**
     * @notice 停用服务
     * @param serviceId 服务ID
     */
    function deactivateService(uint256 serviceId) 
        external 
        onlyAdmin 
        validService(serviceId)
    {
        services[serviceId].active = false;
    }
    
    /**
     * @notice 转移管理员权限
     * @param newAdmin 新管理员地址
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "ComputeMarket: invalid address");
        admin = newAdmin;
    }
    
    // ============ 查询功能 ============
    
    /**
     * @notice 获取任务信息
     * @param taskId 任务ID
     * @return Task 任务信息
     */
    function getTask(uint256 taskId) external view returns (Task memory) {
        return tasks[taskId];
    }
    
    /**
     * @notice 获取服务信息
     * @param serviceId 服务ID
     * @return Service 服务信息
     */
    function getService(uint256 serviceId) external view returns (Service memory) {
        return services[serviceId];
    }
    
    /**
     * @notice 获取任务总数
     * @return uint256 任务总数
     */
    function getTaskCount() external view returns (uint256) {
        return _taskCounter;
    }
    
    /**
     * @notice 获取合约余额
     * @return uint256 合约余额（wei）
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

