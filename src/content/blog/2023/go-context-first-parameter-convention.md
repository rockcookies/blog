---
title: 为什么把 Context 作为 Go 方法的第一个参数
description: 为什么把 Context 作为 Go 方法的第一个参数
pubDate: 2023-07-24
lastModDate: ''
toc: true
share: true
giscus: true
ogImage: true
---

在现代分布式系统中，上下文传递是一个绕不开的核心问题。当一个用户请求进来，我们需要在整个调用链路中传递用户身份、请求 ID、超时设置、取消信号等关键信息。没有可靠的上下文传递机制，就无法实现请求追踪、超时控制、优雅取消这些基础功能。

但不同语言对这个问题给出了截然不同的答案：Java 用 `ThreadLocal`，Node.js 用 `AsyncLocalStorage`，而在 Go 语言中提倡每个函数都把 `context.Context` 放在第一个参数位置。

## Java 中的 ThreadLocal

记得刚开始写 Java 的时候，遇到需要在多个方法间传递用户信息、请求 ID 这些东西，老师傅们总是说："用 ThreadLocal 啊，简单方便！"

```java
// 这样的代码大家都见过
public class UserContext {
    private static final ThreadLocal<String> currentUser = new ThreadLocal<>();

    public static void setCurrentUser(String userId) {
        currentUser.set(userId);
    }

    public static String getCurrentUser() {
        return currentUser.get();
    }
}

// 然后在业务代码里这样用
public void handleRequest(String userId) {
    UserContext.setCurrentUser(userId);
    try {
        doSomeBusiness(); // 这里面可以直接获取到 userId
    } finally {
        UserContext.clear(); // 别忘了清理，不然内存泄漏
    }
}
```

确实很方便，写起来爽。但是用久了就发现问题：

1. **看不出依赖关系**：光看方法签名根本不知道它内部用了什么全局状态
2. **调试地狱**：出了 bug 你都不知道这个值是在哪里被设置的
3. **线程池的坑**：线程复用时经常出现脏数据

更要命的是，现在 Java 也搞虚拟线程了，`ThreadLocal` 的适用场景进一步缩小。

## Node.js 中的 AsyncLocalStorage

Node.js 面临的问题更复杂，因为它是单线程事件循环，ThreadLocal 这套完全不适用。

```javascript
// 没有 AsyncLocalStorage 之前，大家都这样苦哈哈地传参数
async function handleRequest(req, res) {
  const userId = req.headers['user-id']
  await processOrder(userId, orderId)
}

async function processOrder(userId, orderId) {
  await validateOrder(userId, orderId)
  await updateInventory(userId, orderId)
}

// 参数越传越多，烦死了
```

`AsyncLocalStorage` 的出现让 Node.js 开发者松了一口气：

```javascript
const { AsyncLocalStorage } = require('async_hooks')
const asyncLocalStorage = new AsyncLocalStorage()

async function handleRequest(req, res) {
  const store = { userId: req.headers['user-id'], requestId: uuid() }

  await asyncLocalStorage.run(store, async () => {
    await processOrder(orderId)
  })
}

async function processOrder(orderId) {
  const { userId } = asyncLocalStorage.getStore()
  // 神奇！在异步调用链中还能拿到 userId
  await validateOrder(orderId)
}
```

看起来很美好，但问题还是存在：依赖关系不明确，调试困难。

## Go 的"笨办法"：Context 当第一个参数

Go 语言的做法在很多人看来简直是"反人类"：

```go
func HandleRequest(ctx context.Context, userId string) error {
    return ProcessOrder(ctx, userId, orderId)
}

func ProcessOrder(ctx context.Context, userId string, orderId string) error {
    if err := ValidateOrder(ctx, userId, orderId); err != nil {
        return err
    }
    return UpdateInventory(ctx, userId, orderId)
}

func ValidateOrder(ctx context.Context, userId string, orderId string) error {
    // 每个函数都要传 ctx，烦不烦？
    return nil
}
```

刚开始写 Go 的时候，我也觉得这样太啰嗦了。每个函数都要加个 `ctx context.Context`，而且必须放在第一个参数，这不是强迫症吗？

但是慢慢地，我开始理解这种设计的深意。

## 为什么 Go 要这样"固执"？

其实，Go 把 context.Context 强制放在第一个参数位置，**不是为了显摆什么设计理念，而是为了实现上下文传递的基础需求**。

想想看，上下文传递要解决什么问题？

1. **超时控制**：一个请求不能无限制地等下去
2. **取消传播**：用户关闭浏览器，后端也应该停止处理
3. **链路追踪**：能够跟踪一个请求在系统中的完整路径
4. **元数据传递**：用户 ID、请求 ID 这些信息需要跨层传递

要实现这些功能，就必须保证：**调用链路上的每一个环节都能接收和传递这些信息**。

```go
func HandleHTTPRequest(w http.ResponseWriter, r *http.Request) {
    // 从 HTTP 请求创建带超时的 context
    ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
    defer cancel()

    // 添加请求追踪信息
    ctx = context.WithValue(ctx, "requestID", generateID())

    if err := ProcessUserRequest(ctx, getUserID(r)); err != nil {
        // 能够区分是超时还是其他错误
        if err == context.DeadlineExceeded {
            http.Error(w, "Request timeout", 504)
            return
        }
        http.Error(w, err.Error(), 500)
    }
}

func ProcessUserRequest(ctx context.Context, userID string) error {
    // 检查请求是否已被取消
    select {
    case <-ctx.Done():
        return ctx.Err()
    default:
    }

    // 继续传递 context
    return CallExternalAPI(ctx, userID)
}

func CallExternalAPI(ctx context.Context, userID string) error {
    // 使用 context 的超时设置
    client := &http.Client{Timeout: time.Second * 5}
    req, _ := http.NewRequestWithContext(ctx, "GET", apiURL, nil)

    resp, err := client.Do(req)
    // 如果上游取消了请求，这里会立即返回
    return err
}
```

**关键在于**：如果 context 不是强制的第一个参数，开发者很容易"忘记"传递它，导致整个链路断掉。

## 三种方案的本质差异

回头看这三种方案，本质上反映了不同的设计哲学：

**ThreadLocal 和 AsyncLocalStorage**：隐式传递，依赖运行时环境（线程/异步上下文）来维护状态。优点是使用方便，缺点是依赖关系不明确。

**Go Context**：显式传递，通过函数签名强制约定。看起来麻烦，但保证了上下文传递的完整性和可靠性。

举个实际的例子，假设你要实现一个请求超时功能：

- ThreadLocal：需要在某个地方设置超时时间，然后在各个地方检查是否超时，容易遗漏
- AsyncLocalStorage：类似，而且在复杂的异步场景下可能失效
- Go Context：超时信息随着 context 自动传播，任何一个环节都能正确响应取消信号

```go
func longRunningTask(ctx context.Context) error {
    for i := 0; i < 1000000; i++ {
        select {
        case <-ctx.Done():
            log.Println("Task cancelled")
            return ctx.Err()
        default:
            // 继续处理
        }

        // 模拟耗时操作
        time.Sleep(time.Millisecond)
    }
    return nil
}
```

## 写在最后

其实没有哪种方案是绝对完美的。ThreadLocal 和 AsyncLocalStorage 在它们各自的生态中都有存在的合理性。

Go 的 context.Context 作为第一参数的约定，看起来笨拙，但**它是为了确保上下文传递这个基础功能能够可靠工作**。就像安全带一样，你可能觉得麻烦，但关键时刻能救命。

当你的系统需要处理大量并发请求，需要精确的超时控制，需要完整的链路追踪时，你就会明白为什么 Go 要这样"固执"了。

有时候，"笨办法"往往是最可靠的办法。
