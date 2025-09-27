---
title: 一文彻底搞懂 Rust 中的 self、&self、mut self、&mut self
description: 为什么把 Context 作为 Go 方法的第一个参数
pubDate: 2024-06-18
lastModDate: ''
toc: true
share: true
giscus: true
ogImage: true
---


作为一个 Rust 新手，相信你一定被这四种 self 的写法搞得晕头转向。别慌，今天我用最通俗易懂的方式，结合实际代码示例，让你彻底理解它们的区别和使用场景。

## 前言

在学习 Rust 的过程中，方法定义中的 self 参数是绕不开的核心概念。很多初学者看到 `self`、`&self`、`mut self`、`&mut self` 这四种写法时都会一脸懵逼：

- 什么时候用哪种？
- 为什么有时候调用完方法，变量就不能再用了？
- 借用和所有权到底是什么关系？

今天就让我们一次性把这些问题都解决掉！

## 核心概念速览

在深入代码之前，先理解一个关键概念：**所有权系统**

| 写法 | 含义 | 所有权变化 | 使用场景 |
|------|------|------------|----------|
| `self` | 获取所有权 | 转移 | 消费对象、转换对象 |
| `&self` | 不可变借用 | 无变化 | 只读访问 |
| `&mut self` | 可变借用 | 无变化 | 修改对象 |
| `mut self` | 可变所有权 | 转移 | 获取并修改对象 |

## 实战演示：图书管理系统

让我们通过一个图书管理的例子来逐一分析：

```rust
#[derive(Debug)]
struct Book {
    title: String,
    pages: u32,
    available: bool,
}
```

### 1. `self` - 我要"吃掉"这本书

当方法签名是 `self` 时，意味着这个方法会**消费**掉调用的对象。

```rust
impl Book {
    // 归还图书 - 消费掉Book对象
    fn return_to_library(self) {
        println!("📚 《{}》已归还图书馆", self.title);
        // self 在这里被销毁，不再可用
    }

    // 转换为页数 - 典型的消费模式
    fn into_page_count(self) -> u32 {
        println!("正在统计《{}》的页数...", self.title);
        self.pages
    }
}

fn main() {
    let book = Book {
        title: "Rust权威指南".to_string(),
        pages: 500,
        available: true,
    };

    let pages = book.into_page_count();
    println!("总页数: {}", pages);

    // ❌ 编译错误！book 已经被消费了
    // println!("{:?}", book);
}
```

**使用场景**：
- 对象转换（`into_xxx` 方法）
- 资源释放
- 一次性消费操作

### 2. `&self` - 我只是"看看"这本书

这是最常用的形式，只需要读取数据，不修改也不消费。

```rust
impl Book {
    // 获取书名 - 只读访问
    fn get_title(&self) -> &str {
        &self.title
    }

    // 检查是否可借 - 只读判断
    fn is_available(&self) -> bool {
        self.available
    }

    // 获取详细信息 - 只读访问多个字段
    fn get_info(&self) -> String {
        format!(
            "📖 《{}》- {} 页 [{}]",
            self.title,
            self.pages,
            if self.available { "可借" } else { "已借出" }
        )
    }

    // 比较两本书的页数
    fn compare_pages(&self, other: &Book) -> std::cmp::Ordering {
        self.pages.cmp(&other.pages)
    }
}

fn main() {
    let book1 = Book {
        title: "Rust权威指南".to_string(),
        pages: 500,
        available: true,
    };

    let book2 = Book {
        title: "Rust实战".to_string(),
        pages: 400,
        available: false,
    };

    // 可以多次调用不可变方法
    println!("{}", book1.get_info());
    println!("{}", book2.get_info());

    // 比较页数
    match book1.compare_pages(&book2) {
        std::cmp::Ordering::Greater => println!("📚 第一本书更厚"),
        std::cmp::Ordering::Less => println!("📚 第二本书更厚"),
        std::cmp::Ordering::Equal => println!("📚 两本书一样厚"),
    }

    // ✅ book1 和 book2 仍然可用
    println!("book1 仍可用: {}", book1.get_title());
}
```

**使用场景**：
- 获取对象信息
- 计算和比较
- 格式化输出
- 任何不需要修改对象的操作

### 3. `&mut self` - 我要"修改"这本书

当需要修改对象状态时使用，不会获取所有权，但需要独占访问。

```rust
impl Book {
    // 借出图书
    fn borrow_out(&mut self) -> Result<(), &'static str> {
        if !self.available {
            return Err("图书已被借出");
        }
        self.available = false;
        println!("📤 《{}》已借出", self.title);
        Ok(())
    }

    // 归还图书
    fn return_back(&mut self) {
        self.available = true;
        println!("📥 《{}》已归还", self.title);
    }

    // 更新页数（比如发现统计错误）
    fn update_pages(&mut self, new_pages: u32) {
        let old_pages = self.pages;
        self.pages = new_pages;
        println!("📝 《{}》页数从 {} 更新为 {}", self.title, old_pages, new_pages);
    }

    // 修改书名
    fn rename(&mut self, new_title: String) {
        let old_title = std::mem::replace(&mut self.title, new_title);
        println!("📝 书名从《{}》改为《{}》", old_title, self.title);
    }
}

fn main() {
    let mut book = Book {  // 必须声明为 mut
        title: "Rust入门".to_string(),
        pages: 200,
        available: true,
    };

    // 修改操作
    book.borrow_out().unwrap();
    println!("当前状态: {}", book.get_info());

    book.return_back();
    book.update_pages(250);
    book.rename("Rust进阶".to_string());

    // ✅ book 仍然可用，只是状态被修改了
    println!("最终状态: {}", book.get_info());
}
```

**重要提醒**：
- 调用对象必须声明为 `mut`
- 同一时间只能有一个可变借用
- 可变借用期间不能有其他借用

### 4. `mut self` - 我要"拿走并改造"这本书

这种用法相对少见，表示获取所有权并且可以修改。

```rust
impl Book {
    // 升级图书 - 获取所有权并修改后返回
    fn upgrade_edition(mut self, version: u32) -> Book {
        self.title = format!("{} (第{}版)", self.title, version);
        self.pages += 50; // 新版本通常内容更多
        println!("📈 图书已升级: {}", self.title);
        self
    }

    // 转换为电子书格式
    fn convert_to_ebook(mut self) -> EBook {
        // 修改一些属性后转换
        self.pages = (self.pages as f32 * 0.8) as u32; // 电子书页数通常更少

        EBook {
            title: self.title,
            pages: self.pages,
            file_size_mb: self.pages / 10, // 简单计算文件大小
        }
    }
}

#[derive(Debug)]
struct EBook {
    title: String,
    pages: u32,
    file_size_mb: u32,
}

fn main() {
    let book = Book {
        title: "Rust编程".to_string(),
        pages: 300,
        available: true,
    };

    // 升级版本
    let upgraded_book = book.upgrade_edition(2);
    // ❌ book 已经被消费，不可再用

    println!("{:?}", upgraded_book);

    // 转换为电子书
    let ebook = upgraded_book.convert_to_ebook();
    // ❌ upgraded_book 也被消费了

    println!("{:?}", ebook);
}
```

## 实际开发中的选择策略

### 优先级排序

1. **`&self`** - 默认选择，90% 的情况都用这个
2. **`&mut self`** - 需要修改状态时
3. **`self`** - 转换或消费对象时
4. **`mut self`** - 特殊场景，较少使用

### 常见模式

```rust
impl Book {
    // 构造器 - 返回新对象
    fn new(title: String, pages: u32) -> Self {
        Book { title, pages, available: true }
    }

    // Getter - 使用 &self
    fn title(&self) -> &str { &self.title }
    fn pages(&self) -> u32 { self.pages }

    // Setter - 使用 &mut self
    fn set_available(&mut self, available: bool) {
        self.available = available;
    }

    // Builder 模式 - 使用 mut self
    fn with_pages(mut self, pages: u32) -> Self {
        self.pages = pages;
        self
    }

    // 转换方法 - 使用 self
    fn into_title(self) -> String {
        self.title
    }
}

// Builder 模式的使用
fn main() {
    let book = Book::new("基础教程".to_string(), 100)
        .with_pages(200);  // 链式调用

    println!("{:?}", book);
}
```

## 总结

理解这四种 self 的关键在于**所有权思维**：

- 需要对象的完整控制权吗？ → `self` 或 `mut self`
- 只是借用一下？ → `&self` 或 `&mut self`
- 需要修改吗？ → 选择 `mut` 变体

掌握了这些概念，你就能写出更安全、更高效的 Rust 代码。记住，Rust 的所有权系统看似复杂，实际上是在编译时帮你避免了运行时的各种内存问题。
