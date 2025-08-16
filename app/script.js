// =============================================================================
// Node.js 本地服务检测和初始化
// =============================================================================
let hasLocalServer = false;
let serverURL = 'http://localhost:3001'; // 默认本地服务地址

// 检测本地服务是否可用
async function checkLocalServer() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
        const response = await fetch(`${serverURL}/api/health`, {
            method: 'GET',
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.ok) {
            console.log('本地服务连接成功');
            hasLocalServer = true;
            return true;
        }
    } catch (error) {
        console.log('本地服务未启动或连接失败', error);
    }

    hasLocalServer = false;
    return false;
}

// API 请求封装
async function apiRequest(endpoint, options = {}) {
    if (!hasLocalServer) {
        throw new Error('本地服务不可用');
    }

    const response = await fetch(`${serverURL}/api${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    });

    if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
    }

    return response.json();
}

// =============================================================================
// 数据存储管理（双重备份）
// =============================================================================
const STORAGE_KEY = "timeline_v3";
let state = { events: [], topics: [], tasks: [] };

// 统一的数据保存函数（双重备份）
async function saveData() {
    try {
        // 始终保存到 localStorage（作为备份）
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

        // 如果有本地服务，同时保存到文件
        if (hasLocalServer) {
            try {
                await apiRequest('/data', {
                    method: 'POST',
                    body: JSON.stringify(state)
                });
                console.log('数据已保存到本地文件和浏览器存储');
            } catch (error) {
                console.warn('本地文件保存失败，仅保存到浏览器存储:', error.message);
            }
        } else {
            console.log('数据已保存到浏览器存储');
        }
    } catch (error) {
        console.error('数据保存失败:', error);
        throw error;
    }
}

// 统一的数据加载函数（优先本地文件）
async function loadData() {
    try {
        if (hasLocalServer) {
            // 优先从本地文件加载
            try {
                const data = await apiRequest('/data', { method: 'GET' });
                if (data && (data.events || data.topics || data.tasks)) {
                    state = {
                        events: data.events || [],
                        topics: data.topics || [],
                        tasks: data.tasks || []
                    };
                    console.log('从本地文件加载数据成功');
                    return;
                }
            } catch (error) {
                console.warn('从本地文件加载失败，尝试从浏览器存储加载:', error.message);
            }
        }

        // 从 localStorage 加载（降级方案）
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            state = {
                events: parsed.events || [],
                topics: parsed.topics || [],
                tasks: parsed.tasks || []
            };
            console.log('从浏览器存储加载数据成功');

            // 如果有本地服务，将数据同步到文件
            if (hasLocalServer) {
                try {
                    await saveData();
                    console.log('数据已同步到本地文件');
                } catch (error) {
                    console.warn('数据同步失败:', error.message);
                }
            }
        }
    } catch (error) {
        console.error('数据加载失败:', error);
    }

    // 确保数据结构完整
    state.events = state.events || [];
    state.topics = state.topics || [];
    state.tasks = state.tasks || [];
}

// =============================================================================
// 保存状态管理
// =============================================================================
let mode = "add-event";
let currentEdit = null;
let autoSaveTimer = null;
let hasUnsavedChanges = false;
let isAutoSaving = false;

// 原始内容跟踪
let originalContent = {
    title: '',
    body: '',
    topic: ''
};

// =============================================================================
// 工具函数
// =============================================================================
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const nowISO = () => new Date().toISOString();

function escapeHtml(s) {
    return String(s || "").replace(
        /[&<>\"]/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );
}

// =============================================================================
// DOM 引用
// =============================================================================
const taskList = document.getElementById("taskList");
const topicList = document.getElementById("topicList");
const timelineEl = document.getElementById("timeline");
const titleInput = document.getElementById("itemTitle");
const bodyInput = document.getElementById("itemBody");
const topicSelect = document.getElementById("bodyTopicSelect");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const fileImport = document.getElementById("fileImport");
const searchInput = document.getElementById("searchInput");

// =============================================================================
// 保存逻辑核心
// =============================================================================

// 检测内容变化
function detectChanges() {
    const currentContent = {
        title: titleInput.value,
        body: bodyInput.value,
        topic: topicSelect.value
    };

    return (
        currentContent.title !== originalContent.title ||
        currentContent.body !== originalContent.body ||
        currentContent.topic !== originalContent.topic
    );
}

// 更新原始内容基准
function updateOriginalContent() {
    originalContent = {
        title: titleInput.value,
        body: bodyInput.value,
        topic: topicSelect.value
    };
    hasUnsavedChanges = false;
}

// 重置自动保存定时器
function resetAutoSaveTimer() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
    }

    // 只有在编辑模式且有内容变化时才启动自动保存
    if (mode === "edit" && currentEdit && detectChanges()) {
        hasUnsavedChanges = true;
        autoSaveTimer = setTimeout(async () => {
            if (hasUnsavedChanges && !isAutoSaving) {
                await performSave(true);
            }
        }, 10000); // 10秒后自动保存
    }
}

// 执行保存操作
async function performSave(isAutoSave = false) {
    if (isAutoSaving) return; // 防止重复保存

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    const topicId = topicSelect.value || null;

    // 显示保存状态
    if (isAutoSave) {
        isAutoSaving = true;
        updateSaveButtonStatus('saving', '🔄 自动保存中...');
    } else {
        updateSaveButtonStatus('saving', '💾 保存中...');
    }

    try {
        if (mode === "edit" && currentEdit) {
            // 编辑模式保存
            if (!title && !body) {
                if (!isAutoSave) showMessage('请输入内容', 'warning');
                return;
            }

            await saveEditContent(title, body, topicId, isAutoSave);

        } else {
            // 新增模式保存
            await saveNewContent(title, body, topicId);
        }

        // 保存成功
        await saveData();
        renderAll();

        if (isAutoSave) {
            updateSaveButtonStatus('saved', '✅ 已自动保存');
            setTimeout(() => updateSaveButtonStatus(), 2000);
        } else {
            updateSaveButtonStatus('saved', '✅ 已保存');
            setTimeout(() => updateSaveButtonStatus(), 2000);
            if (mode !== 'edit') {
                clearEditor();
            }
        }

        updateOriginalContent();

    } catch (error) {
        console.error('保存失败:', error);
        updateSaveButtonStatus('error', '❌ 保存失败');
        if (!isAutoSave) {
            showMessage('保存失败: ' + error.message, 'error');
        }
        setTimeout(() => updateSaveButtonStatus(), 3000);
    } finally {
        isAutoSaving = false;
    }
}

// 保存编辑内容
async function saveEditContent(title, body, topicId, isAutoSave) {
    if (currentEdit.type === "event") {
        const ev = state.events.find(x => x.id === currentEdit.id);
        if (!ev) throw new Error('事件不存在');

        if (!title && isAutoSave) return; // 自动保存时标题为空则跳过
        if (!title && !isAutoSave) throw new Error('请输入事件标题');

        ev.title = title;
        ev.text = body;
        ev.topic = topicId || null;

    } else if (currentEdit.type === "topic") {
        const t = state.topics.find(x => x.id === currentEdit.id);
        if (!t) throw new Error('主题不存在');

        if (!title && isAutoSave) return;
        if (!title && !isAutoSave) throw new Error('请输入主题名');

        // 检查重名（排除自己）
        if (title.toLowerCase() !== t.name.trim().toLowerCase()) {
            const exists = state.topics.find(x =>
                x.id !== t.id && x.name.trim().toLowerCase() === title.toLowerCase()
            );
            if (exists) throw new Error('存在同名主题');
            t.name = title.trim();
        }
        t.notes = body;

    } else if (currentEdit.type === "task") {
        const tk = state.tasks.find(x => x.id === currentEdit.id);
        if (!tk) throw new Error('任务不存在');

        if (!title && isAutoSave) return;
        if (!title && !isAutoSave) throw new Error('请输入任务标题');

        tk.text = title;
        tk.notes = body;
    }
}

// 保存新内容
async function saveNewContent(title, body, topicId) {
    if (mode === 'add-event') {
        if (!body && !title) throw new Error('请输入事件内容');
        addEvent(title, body, nowISO(), topicId);

    } else if (mode === 'add-task') {
        if (!title) throw new Error('请输入任务标题');
        addTask(title);

    } else if (mode === 'add-topic') {
        if (!title) throw new Error('请输入主题名');
        const res = addTopic(title);
        if (!res.ok) throw new Error(res.msg);
        updateTopic(res.t.id, { notes: body });
    }
}

// 更新保存按钮状态
function updateSaveButtonStatus(status = '', text = '💾 保存') {
    saveBtn.textContent = text;
    saveBtn.className = 'btn' + (status ? ` ${status}` : '');
}

// 显示消息提示
function showMessage(message, type = 'info') {
    const container = document.getElementById('messageContainer');
    const messageBox = document.getElementById('messageBox');

    // 设置消息内容和样式
    messageBox.textContent = message;
    messageBox.className = 'message-box ' + type;

    // 显示消息容器
    container.style.display = 'block';

    // 触发显示动画
    setTimeout(() => {
        messageBox.classList.add('show');
    }, 10);

    // 3秒后自动隐藏消息
    setTimeout(() => {
        messageBox.classList.remove('show');
        setTimeout(() => {
            container.style.display = 'none';
        }, 300);
    }, 3000);

    // 同时输出到控制台
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// 在编辑器跳转前保存当前内容
async function saveBeforeSwitch() {
    if (mode === "edit" && currentEdit && hasUnsavedChanges && !isAutoSaving) {
        try {
            await performSave(true); // 自动保存
        } catch (error) {
            console.error('切换前保存失败:', error);
        }
    }
}

// =============================================================================
// 编辑器管理
// =============================================================================

function clearEditor() {
    titleInput.value = '';
    bodyInput.value = '';
    topicSelect.value = '';
    currentEdit = null;
    updateOriginalContent();

    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
    }
}

async function loadIntoEditor(type, id) {
    // 切换前保存
    await saveBeforeSwitch();

    if (type === 'event') {
        const ev = state.events.find(x => x.id === id);
        if (!ev) return;
        titleInput.value = ev.title || '';
        bodyInput.value = ev.text || '';
        topicSelect.value = ev.topic || '';
    } else if (type === 'topic') {
        const t = state.topics.find(x => x.id === id);
        if (!t) return;
        titleInput.value = t.name;
        bodyInput.value = t.notes || '';
        topicSelect.value = '';
    } else if (type === 'task') {
        const tk = state.tasks.find(x => x.id === id);
        if (!tk) return;
        titleInput.value = tk.text;
        bodyInput.value = tk.notes || '';
        topicSelect.value = '';
    }

    updateOriginalContent();
}

// =============================================================================
// 渲染函数（保持原有逻辑不变）
// =============================================================================

function renderAll() {
    renderTasks();
    renderTopics();
    renderTimeline();
    populateTopicSelect();
}

function reorderListByCheck(listName, id, checked) {
    const arr = state[listName];
    const idx = arr.findIndex((x) => x.id === id);
    if (idx === -1) return;
    const item = arr.splice(idx, 1)[0];
    item.done = !!checked;
    insertItemInOrder(arr, item);
    saveData();
    renderAll();
}

// 通用的项目插入函数，保持勾选状态的正确排序
function insertItemInOrder(arr, item) {
    if (item.done) {
        // 勾选的项目放在所有未勾选项目之后
        const countUnchecked = arr.filter((x) => !x.done).length;
        arr.splice(countUnchecked, 0, item);
    } else {
        // 未勾选的项目放在所有勾选项目之前
        const firstChecked = arr.findIndex((x) => x.done);
        const insertIndex = firstChecked === -1 ? arr.length : firstChecked;
        arr.splice(insertIndex, 0, item);
    }
}

// 置顶操作（保持勾选状态排序）
function moveToTop(listName, id) {
    const arr = state[listName];
    const idx = arr.findIndex((x) => x.id === id);
    if (idx === -1) return;
    const item = arr.splice(idx, 1)[0];
    item.done = !!item.done; // 保持原有的勾选状态
    insertItemInOrder(arr, item);
    saveData();
    renderAll();
}

// 置底操作（保持勾选状态排序）
function moveToBottom(listName, id) {
    const arr = state[listName];
    const idx = arr.findIndex((x) => x.id === id);
    if (idx === -1) return;
    const item = arr.splice(idx, 1)[0];
    item.done = !!item.done; // 保持原有的勾选状态

    // 对于置底操作，我们需要将项目放在同类项目（勾选或未勾选）的末尾
    if (item.done) {
        // 勾选的项目放在所有勾选项目的末尾
        arr.push(item);
    } else {
        // 未勾选的项目放在所有未勾选项目的末尾，但在勾选项目之前
        const firstChecked = arr.findIndex((x) => x.done);
        const insertIndex = firstChecked === -1 ? arr.length : firstChecked;
        arr.splice(insertIndex, 0, item);
    }

    saveData();
    renderAll();
}

function renderTasks() {
    taskList.innerHTML = "";
    state.tasks.forEach((t, idx) => {
        const div = document.createElement("div");
        div.className = "task" + (t.done ? " completed" : "");
        div.style.animationDelay = `${idx * 0.1}s`;

        const left = document.createElement("div");
        left.className = "item-left";
        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.className = "chk";
        chk.checked = !!t.done;
        chk.onchange = () => {
            reorderListByCheck("tasks", t.id, chk.checked);
        };
        const txt = document.createElement("div");
        txt.innerHTML = `<div style="font-weight:500">${escapeHtml(t.text)}</div>`;
        left.appendChild(chk);
        left.appendChild(txt);
        div.appendChild(left);

        const mBtn = document.createElement("div");
        mBtn.className = "more-btn";
        mBtn.innerHTML = "⋮";
        div.appendChild(mBtn);
        taskList.appendChild(div);

        div.onclick = async (e) => {
            if (e.target.type === "checkbox" ||
                e.target.classList.contains("more-btn") ||
                e.target.closest(".more-btn")) return;

            await saveBeforeSwitch();
            mode = "edit";
            currentEdit = { type: "task", id: t.id };
            setModeButton();
            await loadIntoEditor("task", t.id);
        };

        mBtn.onclick = (e) => {
            openMenuForElement(mBtn, [
                {
                    label: "📍 置顶",
                    action: async () => {
                        moveToTop("tasks", t.id);
                    },
                },
                {
                    label: "📌 置底",
                    action: async () => {
                        moveToBottom("tasks", t.id);
                    },
                },
                {
                    label: "⬆️ 上移",
                    action: async () => {
                        if (idx > 0) {
                            state.tasks.splice(idx, 1);
                            state.tasks.splice(idx - 1, 0, t);
                            await saveData();
                            renderAll();
                        }
                    },
                },
                {
                    label: "⬇️ 下移",
                    action: async () => {
                        if (idx < state.tasks.length - 1) {
                            state.tasks.splice(idx, 1);
                            state.tasks.splice(idx + 1, 0, t);
                            await saveData();
                            renderAll();
                        }
                    },
                },
                {
                    label: "✏️ 编辑",
                    action: async () => {
                        await saveBeforeSwitch();
                        mode = "edit";
                        currentEdit = { type: "task", id: t.id };
                        setModeButton();
                        await loadIntoEditor("task", t.id);
                    },
                },
                {
                    label: "🗑️ 删除",
                    action: async () => {
                        if (confirm("删除任务？")) {
                            state.tasks = state.tasks.filter((x) => x.id !== t.id);
                            if (currentEdit?.type === "task" && currentEdit?.id === t.id) {
                                clearEditor();
                            }
                            await saveData();
                            renderAll();
                        }
                    },
                },
            ], e);
        };
    });
}

function renderTopics() {
    topicList.innerHTML = "";
    state.topics.forEach((t, idx) => {
        const box = document.createElement("div");
        box.className = "topic" + (t.done ? " completed" : "");
        box.style.animationDelay = `${idx * 0.1}s`;

        const left = document.createElement("div");
        left.className = "item-left";
        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.className = "chk";
        chk.checked = !!t.done;
        chk.onchange = () => {
            reorderListByCheck("topics", t.id, chk.checked);
        };
        const h = document.createElement("h4");
        h.textContent = t.name;
        h.style.margin = "0";
        h.style.fontSize = "14px";
        h.style.fontWeight = "500";
        left.appendChild(chk);
        left.appendChild(h);
        box.appendChild(left);

        box.onclick = async (e) => {
            if (e.target.type === "checkbox" ||
                e.target.classList.contains("more-btn") ||
                e.target.closest(".more-btn")) return;

            await saveBeforeSwitch();
            mode = "edit";
            currentEdit = { type: "topic", id: t.id };
            setModeButton();
            await loadIntoEditor("topic", t.id);
        };

        const mBtn = document.createElement("div");
        mBtn.className = "more-btn";
        mBtn.innerHTML = "⋮";
        box.appendChild(mBtn);
        topicList.appendChild(box);

        mBtn.onclick = (e) => {
            openMenuForElement(mBtn, [
                {
                    label: "📌 置顶",
                    action: async () => {
                        moveToTop("topics", t.id);
                    },
                },
                {
                    label: "📍 置底",
                    action: async () => {
                        moveToBottom("topics", t.id);
                    },
                },
                {
                    label: "⬆️ 上移",
                    action: async () => {
                        if (idx > 0) {
                            state.topics.splice(idx, 1);
                            state.topics.splice(idx - 1, 0, t);
                            await saveData();
                            renderAll();
                        }
                    },
                },
                {
                    label: "⬇️ 下移",
                    action: async () => {
                        if (idx < state.topics.length - 1) {
                            state.topics.splice(idx, 1);
                            state.topics.splice(idx + 1, 0, t);
                            await saveData();
                            renderAll();
                        }
                    },
                },
                {
                    label: "✏️ 重命名/编辑笔记",
                    action: async () => {
                        await saveBeforeSwitch();
                        mode = "edit";
                        currentEdit = { type: "topic", id: t.id };
                        setModeButton();
                        await loadIntoEditor("topic", t.id);
                    },
                },
                {
                    label: "🗑️ 删除",
                    action: async () => {
                        if (confirm("删除主题？对应事件将取消关联")) {
                            state.topics = state.topics.filter((x) => x.id !== t.id);
                            state.events.forEach((ev) => {
                                if (ev.topic === t.id) ev.topic = null;
                            });
                            if (currentEdit?.type === "topic" && currentEdit?.id === t.id) {
                                clearEditor();
                            }
                            await saveData();
                            renderAll();
                        }
                    },
                },
            ], e);
        };
    });
}

function renderTimeline() {
    timelineEl.innerHTML = '';

    const q = (searchInput.value || '').trim().toLowerCase();
    const list = state.events.filter(ev => {
        if (!q) return true;
        const txt = (ev.text || '').toLowerCase();
        const topicName = ev.topic ?
            (state.topics.find(t => t.id === ev.topic) || { name: '' }).name.toLowerCase() : '';
        return txt.includes(q) || topicName.includes(q);
    });

    list.sort((a, b) => new Date(b.ts) - new Date(a.ts)); // 新事件在前
    list.forEach((ev, idx) => {
        const node = document.createElement("div");
        node.className = "node";
        node.style.animationDelay = `${idx * 0.1}s`;

        const title = document.createElement("div");
        title.className = "title";
        title.textContent = ev.title || (ev.text ? ev.text.split(/\n/)[0] : "") || "(无内容)";

        const timeEl = document.createElement("time");
        timeEl.textContent = new Date(ev.ts).toLocaleString();

        // 不再添加内容预览

        // 添加主题标签
        const topicTag = document.createElement("div");
        topicTag.className = "topic-tag";
        const topic = ev.topic ? state.topics.find(t => t.id === ev.topic) : null;
        topicTag.textContent = topic ? topic.name : "无主题";
        topicTag.style.display = ev.topic ? "inline-block" : "none";

        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = "×";
        deleteBtn.className = "delete-btn";

        deleteBtn.onclick = async (e) => {
            e.stopPropagation();
            if (confirm("确认删除这个事件？")) {
                state.events = state.events.filter((event) => event.id !== ev.id);
                await saveData();
                renderAll();
                if (currentEdit?.type === "event" && currentEdit?.id === ev.id) {
                    clearEditor();
                }
            }
        };

        node.appendChild(title);
        node.appendChild(timeEl);
        node.appendChild(topicTag);
        node.appendChild(deleteBtn);
        timelineEl.appendChild(node);

        node.onclick = async () => {
            await saveBeforeSwitch();
            mode = "edit";
            currentEdit = { type: "event", id: ev.id };
            setModeButton();
            await loadIntoEditor("event", ev.id);
            node.scrollIntoView({ behavior: "smooth", inline: "center" });
        };
    });
}

function populateTopicSelect() {
    topicSelect.innerHTML = '<option value="">🏷️ (不关联)</option>';
    state.topics
        .filter((t) => t.done !== true)
        .forEach((t) => {
            const o = document.createElement("option");
            o.value = t.id;
            o.textContent = t.name;
            topicSelect.appendChild(o);
        });
}

// =============================================================================
// 数据操作函数（保持原有逻辑不变）
// =============================================================================

function addEvent(title, text, ts = null, topic = null) {
    const ev = {
        id: uid(),
        ts: ts || nowISO(),
        title: title || '',
        text: text || '',
        topic: topic || null,
    };
    state.events.push(ev);
}

function addTask(text) {
    const task = {
        id: uid(),
        text,
        done: false,
        notes: '',
        createdAt: nowISO()
    };
    state.tasks.unshift(task);
}

function addTopic(name) {
    if (!name) return { ok: false, msg: '名称为空' };
    const exists = state.topics.find(t =>
        t.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (exists) return { ok: false, msg: '主题已存在' };

    const t = {
        id: uid(),
        name: name.trim(),
        notes: '',
        done: false,
        createdAt: nowISO()
    };

    state.topics.unshift(t);
    return { ok: true, t };
}

function updateTopic(id, data) {
    const t = state.topics.find((x) => x.id === id);
    if (!t) return;
    Object.assign(t, data);
}

// =============================================================================
// 菜单系统（保持原有逻辑不变）
// =============================================================================

function openMenuForElement(anchor, items, event) {
    const parent = anchor.parentElement;
    const existing = parent.querySelector(".menu-card");
    if (existing) {
        existing.remove();
        return;
    }

    document.querySelectorAll(".menu-card").forEach((n) => n.remove());
    if (event) {
        event.stopPropagation();
    }

    const card = document.createElement("div");
    card.className = "menu-card";
    card.onclick = (e) => {
        e.stopPropagation();
    };

    items.forEach((it) => {
        const btn = document.createElement("button");
        btn.textContent = it.label;
        btn.onclick = async () => {
            try {
                await it.action();
            } catch (e) {
                console.error(e);
            }
            card.remove();
        };
        card.appendChild(btn);
    });

    document.body.appendChild(card);

    const rect = anchor.getBoundingClientRect();
    card.style.position = "fixed";
    card.style.left = rect.right - 180 + "px";

    const menuHeight = card.offsetHeight;
    const spaceBelow = window.innerHeight - rect.bottom - 10;
    const spaceAbove = rect.top - 10;

    if (spaceBelow < menuHeight && spaceAbove >= menuHeight) {
        card.style.top = rect.top - menuHeight - 5 + "px";
    } else {
        card.style.top = rect.bottom + 5 + "px";
    }
}

// =============================================================================
// 文件操作（支持本地服务）
// =============================================================================

async function exportData() {
    try {
        const dataStr = JSON.stringify(state, null, 2);
        const fileName = "timeline_export_" +
            new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + ".json";

        if (hasLocalServer) {
            // 通过本地服务导出
            try {
                await apiRequest('/export', {
                    method: 'POST',
                    body: JSON.stringify({
                        data: state,
                        filename: fileName
                    })
                });
                showMessage('✅ 数据已成功导出到本地文件：' + fileName, 'success');
            } catch (error) {
                console.warn('本地服务导出失败，使用浏览器下载:', error.message);
                // 降级到浏览器下载
                downloadAsFile(dataStr, fileName);
            }
        } else {
            // 浏览器环境：直接下载
            downloadAsFile(dataStr, fileName);
        }
    } catch (error) {
        console.error('导出失败:', error);
        showMessage('❌ 导出失败: ' + error.message, 'error');
    }
}

// 浏览器下载文件
function downloadAsFile(content, filename) {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showMessage('✅ 数据已通过浏览器下载：' + filename, 'success');
}

async function importData() {
    // 直接触发文件选择，不依赖本地服务
    fileImport.click();
}

// 处理导入的数据，生成缺失的ID并排序事件
function processImportedDataStructure(imported) {
    // 确保基本结构存在
    const processed = {
        events: Array.isArray(imported.events) ? [...imported.events] : [],
        topics: Array.isArray(imported.topics) ? [...imported.topics] : [],
        tasks: Array.isArray(imported.tasks) ? [...imported.tasks] : []
    };

    // 处理事件：生成缺失的ID
    processed.events = processed.events.map(event => {
        return {
            ...event,
            id: event.id || uid(),
            ts: event.ts || new Date().toISOString()
        };
    });

    // 处理主题：生成缺失的ID
    processed.topics = processed.topics.map(topic => {
        return {
            ...topic,
            id: topic.id || uid(),
            createdAt: topic.createdAt || new Date().toISOString()
        };
    });

    // 处理任务：生成缺失的ID
    processed.tasks = processed.tasks.map(task => {
        return {
            ...task,
            id: task.id || uid(),
            createdAt: task.createdAt || new Date().toISOString()
        };
    });

    // 按时间戳对事件进行排序（升序）
    processed.events.sort((a, b) => new Date(a.ts) - new Date(b.ts));

    return processed;
}

async function processImportedData(content) {
    try {
        const imported = JSON.parse(content);
        if (!imported) throw new Error("格式错误");

        // 处理导入的数据：生成缺失的ID并排序事件
        const processedData = processImportedDataStructure(imported);

        // 自动备份当前数据
        try {
            const backupData = JSON.stringify(state, null, 2);
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
            const backupFileName = `llog_backup_${timestamp}.json`;

            if (hasLocalServer) {
                // 通过本地服务备份
                await apiRequest('/export', {
                    method: 'POST',
                    body: JSON.stringify({
                        data: state,
                        filename: backupFileName
                    })
                });
            } else {
                // 浏览器环境：直接下载备份
                downloadAsFile(backupData, backupFileName);
            }
        } catch (backupError) {
            console.warn('自动备份失败:', backupError);
        }

        // 直接替换数据
        state = processedData;
        await saveData();
        renderAll();
        showMessage('导入完成，原数据已自动备份', 'success');
    } catch (err) {
        showMessage('导入失败：' + err.message, 'error');
    }
}

// =============================================================================
// 事件监听器设置
// =============================================================================

function setupEventListeners() {
    // 输入变化监听
    titleInput.addEventListener('input', resetAutoSaveTimer);
    bodyInput.addEventListener('input', resetAutoSaveTimer);
    topicSelect.addEventListener('change', resetAutoSaveTimer);

    // 保存按钮
    saveBtn.onclick = () => performSave(false);

    // 取消按钮
    cancelBtn.onclick = () => {
        if (hasUnsavedChanges && !confirm('有未保存的更改，确认取消？')) {
            return;
        }
        clearEditor();
    };

    // 模式切换按钮
    document.querySelectorAll(".mode-btn").forEach((b) => {
        b.onclick = async () => {
            await saveBeforeSwitch();

            document.querySelectorAll(".mode-btn").forEach((x) => x.classList.remove("active"));
            b.classList.add("active");
            mode = b.dataset.mode;
            clearEditor();
        };
    });

    // 搜索输入
    searchInput.addEventListener("input", () => {
        renderTimeline();
    });

    // 导入导出按钮
    const btnExport = document.getElementById("btnExport");
    btnExport.onclick = exportData;

    const btnImportLbl = document.getElementById("btnImportLbl");
    btnImportLbl.onclick = importData;

    // 浏览器环境的文件输入处理
    fileImport.onchange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            await processImportedData(ev.target.result);
        };
        reader.readAsText(f);
        e.target.value = null;
    };


    // 服务状态检查按钮
    const btnCheckServer = document.getElementById("btnCheckServer");
    if (btnCheckServer) {
        btnCheckServer.onclick = async () => {
            updateServerStatus('checking');
            const connected = await checkLocalServer();
            updateServerStatus(connected ? 'connected' : 'disconnected');

            if (connected) {
                showMessage('本地服务连接成功', 'success');
                // 重新加载数据以同步
                await loadData();
                renderAll();
            } else {
                showMessage('本地服务未启动', 'warning');
            }
        };
    }

    // 点击外部关闭菜单
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".menu-card") && !e.target.closest(".more-btn")) {
            document.querySelectorAll(".menu-card").forEach((n) => n.remove());
        }
    });

    // 键盘快捷键
    document.addEventListener("keydown", async (e) => {
        // Ctrl+S 保存
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            await performSave(false);
        }

        // Ctrl+Delete 删除当前编辑项
        if (e.ctrlKey && e.key === "Delete" && currentEdit) {
            await deleteCurrentEditItem();
        }
    });

}

// 更新服务器状态显示
function updateServerStatus(status) {
    const statusEl = document.getElementById("serverStatus");
    if (!statusEl) return;

    switch (status) {
        case 'checking':
            statusEl.textContent = '🔄 检测中...';
            statusEl.className = 'server-status checking';
            break;
        case 'connected':
            statusEl.textContent = '🟢 已连接';
            statusEl.className = 'server-status connected';
            break;
        case 'disconnected':
            statusEl.textContent = '🔴 未连接';
            statusEl.className = 'server-status disconnected';
            break;
    }
}

async function deleteCurrentEditItem() {
    if (!currentEdit) return;

    if (currentEdit.type === "event") {
        if (confirm("删除该事件？")) {
            state.events = state.events.filter(e => e.id !== currentEdit.id);
            clearEditor();
            await saveData();
            renderAll();
        }
    } else if (currentEdit.type === "topic") {
        if (confirm("删除主题？对应事件将取消关联")) {
            state.topics = state.topics.filter(t => t.id !== currentEdit.id);
            state.events.forEach(ev => {
                if (ev.topic === currentEdit.id) ev.topic = null;
            });
            clearEditor();
            await saveData();
            renderAll();
        }
    } else if (currentEdit.type === "task") {
        if (confirm("删除任务？")) {
            state.tasks = state.tasks.filter(x => x.id !== currentEdit.id);
            clearEditor();
            await saveData();
            renderAll();
        }
    }
}

function setModeButton() {
    document.querySelectorAll(".mode-btn").forEach((x) => x.classList.remove("active"));
    const btn = Array.from(document.querySelectorAll(".mode-btn")).find(
        (b) => b.dataset.mode === mode
    );
    if (btn) btn.classList.add("active");
}

// =============================================================================
// 应用初始化
// =============================================================================

async function initializeApp() {
    try {
        console.log('LLog 应用初始化中...');

        // 检测本地服务
        updateServerStatus('checking');
        const serverConnected = await checkLocalServer();
        updateServerStatus(serverConnected ? 'connected' : 'disconnected');

        // 加载数据
        await loadData();

        // 设置事件监听器
        setupEventListeners();

        // 初始渲染
        renderAll();

        console.log('LLog 应用初始化完成');
        console.log('本地服务状态:', serverConnected ? '已连接' : '未连接');
        console.log('数据存储方式:', serverConnected ? '文件+浏览器双重备份' : '仅浏览器存储');

    } catch (error) {
        console.error('应用初始化失败:', error);
    }
}

// 启动应用
document.addEventListener('DOMContentLoaded', initializeApp);

// 页面卸载时的处理
window.addEventListener("beforeunload", async (e) => {
    if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '有未保存的更改，确认离开？';

        // 尝试快速保存
        try {
            await performSave(true);
        } catch (error) {
            console.error('页面卸载前保存失败:', error);
        }
    }
});