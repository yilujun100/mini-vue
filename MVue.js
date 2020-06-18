function cb(val) {
    console.log('数据更新了', val);
}
class MVue {
    constructor(options) {
        this.$options =  options;
        this._data = options.data;
        this.observe(this._data);
        // 执行编译
        new Compile(options.el, this);
        if (options.created) {
            options.created.call(this);
        }
        /* new Watcher();
        // 模拟render的过程，为了触发message属性的get函数
        console.log('模拟render,触发message的getter', this._data.message); */
    }

    observe(value) {
        if (!value || typeof value !== 'object') {
            return;
        }
        Object.keys(value).forEach(key => {
            this.defineReactive(value, key, value[key]);
            this.proxyData(key);
        });
    }

    // 数据响应化核心: 通过Object.defineProperty对数据进行劫持
    defineReactive(obj, key, val) {
        this.observe(val); // 解决数据深层嵌套
        const dep = new Dep();

        Object.defineProperty(obj, key, {
            enumerable: true, // 属性可枚举
            configurable: true, // 属性可被修改或删除
            get: function reactiveGetter() {
                // @todo: 依赖收集
                Dep.target && dep.addDep(Dep.target);
                return val;
            },
            set: function reactiveSetter(newVal) {
                if (newVal === val) return;
                val = newVal;
                // @todo: set的时候触发dep的notify通知所有的Watcher对象更新视图
                dep.notify();
            }
        });
    }

    // 数据代理
    proxyData(key) {
        Object.defineProperty(this, key, {
            get() {
                return this._data[key];
            },
            set(newVal) {
                this._data[key] = newVal;
            }
        });
    }
}

// 依赖收集
class Dep {
    constructor() {
        // 存储所有的依赖
        this.deps = [];
    }

    // 在deps中添加一个监听器对象
    addDep(dep) {
        this.deps.push(dep);
    }

    depend() {
        if (Dep.target) {
            Dep.target.addDep(this);
        }
    }

    // 通知所有的监听器去更新视图
    notify() {
        this.deps.forEach(dep => {
            dep.update();
        });
    }
}

class Watcher {
    constructor(vm, key, cb) {
        this.vm = vm;
        this.key = key;
        this.cb = cb;
        // 在new一个Watcher时将该对象赋值给Dep的静态属性target,在get中会用到
        Dep.target = this;
        this.vm[this.key];
        Dep.target = null;
    }

    // 视图更新
    update() {
        // console.log('视图更新了');
        // 通知页面做更新
        this.cb.call(this.vm, this.vm[this.key]);
    }
}