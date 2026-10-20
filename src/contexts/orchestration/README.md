# 协调 Context

complete-dining 只通过公开 Port.In 协调 Dining、DiningHistory 和 ReceiptCollection；自身不设置 Domain。事务通过自身
Port.Out 注入，保存成功后统一发布各领域的展示状态。
