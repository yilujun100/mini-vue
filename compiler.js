class Compile {
    /**
     * @param {*} el 挂载的目标对象
     * @param {*} vm 当前Vue实例
     */
    constructor(el, vm) {
        this.$el = document.querySelector(el);
        this.$vm = vm;
        if (this.$el) {
            // 1.将dom节点转换为Fragment提高执行效率
            this.$fragment = this.node2Fragment(this.$el);
            // 2.执行编译，编译完成以后所有的依赖已经替换成真正的值
            this.compile(this.$fragment);
            // 3.将生成的结果追加至宿主元素
            this.$el.appendChild(this.$fragment);
        }
    }

    node2Fragment(el) {
        const fragment = document.createDocumentFragment();
        let child;
        // 将原生节点移动至fragment
        while ((child = el.firstChild)) {
            fragment.appendChild(child);
        }
        return fragment;
    }

    // 编译指定片段
    compile(el) {
        let childNodes = el.childNodes;
        Array.from(childNodes).forEach(node => {
            const expRE = /\{\{(.*)\}\}/;
            // 根据node类型的不同，做相应处理
            if (this.isElementNode(node)) {
                this.compileElement(node);
            } else if (this.isTextNode(node) && expRE.test(node.textContent)) {
                this.compileText(node, RegExp.$1);
            }
            // 遍历编译子节点
            if (node.childNodes && node.childNodes.length) {
                this.compile(node);
            }
        });
    }

    // 编译元素节点
    compileElement(node) {
        const attrs = node.attributes;
        Array.from(attrs).forEach(attr => {
            const attrName = attr.name;
            const exp = attr.value;
            if (this.isDirective(attrName)) { // 指令 v-开头
                const dir = attrName.substr(2)
                this[dir] && this[dir](node, this.$vm, exp);
            } else if (this.isEventDirective(attrName)) { // 事件@开头
                const dir = attrName.substr(1);
                this.eventHandler(node, this.$vm, exp, dir);
            }
        });
    }

    // 编译文本节点
    compileText(node, exp) {
        this.text(node, this.$vm, exp);
    }

    isElementNode(node) {
        return node.nodeType === 1;
    }

    isTextNode(node) {
        return node.nodeType === 3;
    }

    isDirective(attr) {
        return attr.indexOf('v-') === 0;
    }

    isEventDirective(dir) {
        return dir.indexOf('@') === 0;
    }

    // 文本更新
    text(node, vm, exp) {
        this.update(node, vm, exp, 'text');
    }

    // 处理html
    html(node, vm, exp) {
        this.update(node, vm, exp, 'html');
    }

    // 双向绑定
    model(node, vm, exp) {
        this.update(node, vm, exp, 'model');
        let val = vm.exp;
        // 双绑还要处理视图对模型的更新
        node.addEventListener('input', e => {
            vm[exp] = e.target.value;
        });
    }

    // 更新
    // 能够触发这个update方法的时机有两个： 1.编译器初始化视图时触发 2.数据发生变化Watcher更新视图时触发
    update(node, vm, exp, dir) {
        let updaterFn = this[`${dir}Updater`];
        updaterFn && updaterFn(node, exp.indexOf('.') !== -1 ? this.parseExp(vm, exp) : vm[exp]); // 立即执行更新;这里的vm[exp]相当于执行了get
        new Watcher(vm, exp, function(value) {
            // 每次创建Watcher实例，都会传入一个回调函数，使函数和Watcher实例之间形成一对一的挂钩关系
            // 将来数据发生变化时，Watcher就能知道它更新的时候要执行哪个函数
            updaterFn && updaterFn(node, value);
        });
    }

    parseExp(obj, str) {
        let result;
        const arr = str.split('.');
        arr.forEach((item, index) => {
            if (index === 0) {
                result = obj[item];
            } else {
                result = result[item];
            }
        });
        return result;
    }

    textUpdater(node, value) {
        node.textContent = value;
    }

    htmlUpdater(node, value) {
        node.innerHTML = value;
    }

    modelUpdater(node, value) {
        node.value = value;
    }

    eventHandler(node, vm, exp, dir) {
        let fn = vm.$options.methods && vm.$options.methods[exp];
        if (dir && fn) {
            node.addEventListener(dir, fn.bind(vm), false);
        }
    }
}