import { useState, useRef, useEffect } from 'react'
import { Input, Button, Spin, ConfigProvider, Tooltip, Popconfirm, message } from 'antd'
import { SendOutlined, PlusOutlined, CopyOutlined, ReloadOutlined, DeleteOutlined, DownloadOutlined, MenuOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { repairMarkdownTables, splitEvidenceSQL } from './markdown'
import './App.css'

interface Msg { role: 'user' | 'assistant'; content: string }
interface SessionItem { id: string; title: string; last_at: string | null }

const SUGGESTIONS = [
    '案件卡在哪个环节？请给案件ID或材料编号',
    '按案号片段、案件ID尾号或材料编号查找候选案件',
    '最近24小时有哪些文件 OCR 失败或卡住？',
    '最近24小时 EBW 重试分布和失败原因是什么？',
    '最近24小时已审核但还没立案成功的 RPA 案件有哪些？',
    '最近7天每天收了多少案？按来源和案件类型统计',
    '位军最近一周的工作量',
    '位军最近一周编目了多少件，按案件类型分类，含件数和页数',
    '最近7天按案件类型统计登记、接收、扫描、编目、审核、卷宗推送各有多少件次',
]

function groupByDate(sessions: SessionItem[]) {
    const now = Date.now()
    const day = 86400000
    const groups: Record<string, SessionItem[]> = { '7天内': [], '30天内': [], '更早': [] }
    for (const s of sessions) {
        const t = s.last_at ? new Date(s.last_at).getTime() : 0
        const diff = now - t
        if (diff < 7 * day) groups['7天内'].push(s)
        else if (diff < 30 * day) groups['30天内'].push(s)
        else groups['更早'].push(s)
    }
    return groups
}

export default function App() {
    const [sessions, setSessions] = useState<SessionItem[]>([])
    const [sessionId, setSessionId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Msg[]>([])
    const [sending, setSending] = useState(false)
    const [loading, setLoading] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    const loadSessions = async () => {
        try {
            const r = await fetch('/api/v1/sessions')
            const d = await r.json()
            setSessions(d.sessions || [])
        } catch { }
    }

    useEffect(() => { loadSessions() }, [])

    async function deleteSession(id: string) {
        try {
            const r = await fetch(`/api/v1/sessions/${id}`, { method: 'DELETE' })
            if (!r.ok) throw new Error('删除失败')
            setSessions(prev => prev.filter(s => s.id !== id))
            if (sessionId === id) {
                setSessionId(null)
                setMessages([])
            }
            message.success('已删除')
        } catch {
            message.error('删除失败')
        }
    }

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    async function openSession(id: string) {
        setMobileMenuOpen(false)
        setSessionId(id)
        setLoading(true)
        try {
            const r = await fetch(`/api/v1/sessions/${id}/messages`)
            const d = await r.json()
            setMessages((d.messages || []).map((m: any) => ({ role: m.role, content: m.content })))
        } catch { }
        setLoading(false)
    }

    function newChat() {
        setMobileMenuOpen(false)
        setSessionId(null)
        setMessages([])
    }

    async function send(text?: string) {
        const question = (text || '').trim()
        if (!question || sending) return
        setSending(true)
        setMessages(prev => [...prev, { role: 'user', content: question }, { role: 'assistant', content: '' }])

        try {
            const body: any = { question }
            if (sessionId) body.session_id = sessionId
            const resp = await fetch('/api/v1/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const reader = resp.body!.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let answer = ''
            let sid = sessionId
            const steps: Step[] = []
            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''
                let event = ''
                for (const line of lines) {
                    if (line.startsWith('event: ')) event = line.slice(7)
                    else if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6))
                            if (event === 'thinking') { if (data.session_id) sid = data.session_id }
                            else if (event === 'tool_call') {
                                steps.push({ kind: 'call', label: data.label, tool: data.tool })
                                setMessages(prev => {
                                    const next = [...prev]
                                    next[next.length - 1] = { role: 'assistant', content: '', steps: [...steps] }
                                    return next
                                })
                            }
                            else if (event === 'tool_result') {
                                steps.push({ kind: 'result', ok: data.ok, rowCount: data.row_count, error: data.error })
                                setMessages(prev => {
                                    const next = [...prev]
                                    next[next.length - 1] = { role: 'assistant', content: '', steps: [...steps] }
                                    return next
                                })
                            }
                            else if (event === 'done') { answer = data.answer || ''; if (data.session_id) sid = data.session_id }
                            else if (event === 'error') answer = `[错误] ${data.message}`
                        } catch { }
                    }
                }
            }
            setMessages(prev => {
                const next = [...prev]
                next[next.length - 1] = { role: 'assistant', content: answer, steps: [...steps] }
                return next
            })
            if (sid) { setSessionId(sid); loadSessions() }
        } catch (e: any) {
            setMessages(prev => {
                const next = [...prev]
                next[next.length - 1] = { role: 'assistant', content: `[网络错误] ${e.message}` }
                return next
            })
        }
        setSending(false)
    }

    async function copyText(t: string) {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(t)
            } else {
                throw new Error('Clipboard API unavailable')
            }
        } catch {
            const textarea = document.createElement('textarea')
            textarea.value = t
            textarea.setAttribute('readonly', '')
            textarea.style.position = 'fixed'
            textarea.style.opacity = '0'
            document.body.appendChild(textarea)
            textarea.select()
            const copied = document.execCommand('copy')
            textarea.remove()
            if (!copied) {
                message.error('复制失败，请手动选择内容复制')
                return
            }
        }
        message.success('已复制')
    }

    function downloadText(filename: string, text: string) {
        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)
    }

    const groups = groupByDate(sessions)
    const isEmpty = messages.length === 0

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#4d6bfe', borderRadius: 8, fontSize: 14 } }}>
            <div className="app">
                {/* 左侧会话列表 */}
                <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
                    <div className="sidebar-top">
                        <div className="brand">案卷问答</div>
                        <button className="new-chat" onClick={newChat}>
                            <PlusOutlined /> 开启新对话
                        </button>
                    </div>
                    <div className="session-list">
                        {Object.entries(groups).map(([label, items]) =>
                            items.length > 0 && (
                                <div key={label} className="session-group">
                                    <div className="group-label">{label}</div>
                                    {items.map(s => (
                                        <div
                                            key={s.id}
                                            className={`session-item ${s.id === sessionId ? 'active' : ''}`}
                                            onClick={() => openSession(s.id)}
                                            title={s.title}
                                        >
                                            <span className="session-title">{s.title}</span>
                                            <Popconfirm
                                                title="删除该对话？"
                                                description="对话记录将一并删除，审计日志保留。"
                                                okText="删除"
                                                cancelText="取消"
                                                okButtonProps={{ danger: true }}
                                                onConfirm={(e) => { e?.stopPropagation(); deleteSession(s.id) }}
                                            >
                                                <button
                                                    className="session-delete"
                                                    onClick={e => e.stopPropagation()}
                                                    aria-label="删除对话"
                                                >
                                                    <DeleteOutlined />
                                                </button>
                                            </Popconfirm>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                </aside>
                {mobileMenuOpen && (
                    <button className="sidebar-backdrop" aria-label="关闭会话列表" onClick={() => setMobileMenuOpen(false)} />
                )}

                {/* 主区域 */}
                <main className="main">
                    <header className="topbar">
                        <button className="mobile-menu" aria-label="打开会话列表" onClick={() => setMobileMenuOpen(true)}>
                            <MenuOutlined />
                        </button>
                        <span className="topbar-title">
                            {sessionId ? (sessions.find(s => s.id === sessionId)?.title || '对话') : '新对话'}
                        </span>
                    </header>

                    <div className="scroll" ref={scrollRef}>
                        <div className="thread">
                            {isEmpty && !loading && (
                                <div className="welcome">
                                    <div className="welcome-mark">案</div>
                                    <h2>今天想查什么？</h2>
                                    <div className="chips">
                                        {SUGGESTIONS.map(s => (
                                            <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {loading && <div className="loading"><Spin /></div>}

                            {messages.map((m, i) =>
                                m.role === 'user' ? (
                                    <div key={i} className="turn user">
                                        <div className="bubble">{m.content}</div>
                                    </div>
                                ) : (
                                    <div key={i} className="turn assistant">
                                        {m.steps && m.steps.length > 0 && (
                                            <div className="steps">
                                                {m.steps.map((s, si) =>
                                                    s.kind === 'call' ? (
                                                        <div key={si} className="step call">
                                                            <span className="step-dot" />
                                                            <span className="step-label">{s.label}</span>
                                                        </div>
                                                    ) : (
                                                        <div key={si} className={`step result ${s.ok ? 'ok' : 'fail'}`}>
                                                            {s.ok
                                                                ? `✓${s.rowCount != null ? ` ${s.rowCount} 行` : ''}`
                                                                : `✗ ${s.error || '失败'}`}
                                                        </div>
                                                    )
                                                )}
                                                {!m.content && <div className="step pending">处理中…</div>}
                                            </div>
                                        )}

                                        {m.content ? (
                                            <>
                                                <div className="answer">
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={{
                                                            code({ node, className, children, ...props }: any) {
                                                                const m = /language-(\w+)/.exec(className || '')
                                                                return m ? (
                                                                    <SyntaxHighlighter style={oneDark} language={m[1]} PreTag="div" customStyle={{ borderRadius: 8, fontSize: 12 }}>
                                                                        {String(children).replace(/\n$/, '')}
                                                                    </SyntaxHighlighter>
                                                                ) : <code className="inline" {...props}>{children}</code>
                                                            },
                                                            // 宽表格（如每日收案量 9 列）会溢出容器：包一层横向滚动，
                                                            // 否则右侧列直接被裁掉。窄表格靠 table 自身 width:100% 撑满。
                                                            table({ children, ...props }: any) {
                                                                return (
                                                                    <div className="table-wrap">
                                                                        <table {...props}>{children}</table>
                                                                    </div>
                                                                )
                                                            }
                                                        }}
                                                    >
                                                        {repairMarkdownTables(splitEvidenceSQL(m.content).answer)}
                                                    </ReactMarkdown>
                                                    {splitEvidenceSQL(m.content).sql && (
                                                        <details className="sql-details">
                                                            <summary>查看 SQL 查询依据</summary>
                                                            <div className="sql-toolbar">
                                                                <span className="sql-language">sql</span>
                                                                <div className="sql-actions">
                                                                    <button onClick={() => copyText(splitEvidenceSQL(m.content).sql!)}>
                                                                        <CopyOutlined /> 复制
                                                                    </button>
                                                                    <button onClick={() => downloadText('query.sql', splitEvidenceSQL(m.content).sql!)}>
                                                                        <DownloadOutlined /> 下载
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <SyntaxHighlighter
                                                                style={oneDark}
                                                                language="sql"
                                                                PreTag="div"
                                                                customStyle={{ margin: 0, borderRadius: '0 0 10px 10px', fontSize: 12 }}
                                                            >
                                                                {splitEvidenceSQL(m.content).sql!}
                                                            </SyntaxHighlighter>
                                                        </details>
                                                    )}
                                                </div>
                                                <div className="actions">
                                                    <Tooltip title="复制"><button onClick={() => copyText(m.content)}><CopyOutlined /></button></Tooltip>
                                                    <Tooltip title="重新生成"><button onClick={() => {
                                                        const prevUser = messages[i - 1]
                                                        if (prevUser) { setMessages(messages.slice(0, i - 1)); send(prevUser.content) }
                                                    }}><ReloadOutlined /></button></Tooltip>
                                                </div>
                                            </>
                                        ) : (!m.steps || m.steps.length === 0) ? <span className="typing">正在思考…</span> : null}
                                    </div>
                                )
                            )}
                            <div ref={bottomRef} />
                        </div>
                    </div>

                    <footer className="composer">
                        <Composer sending={sending} onSend={send} />
                    </footer>
                </main>
            </div>
        </ConfigProvider>
    )
}

// 输入框独立持有草稿 state：打字只重渲染 Composer，不触发整个消息列表
// （含 ReactMarkdown/SyntaxHighlighter）重渲染，否则会话越长打字越卡
function Composer({ sending, onSend }: { sending: boolean; onSend: (text: string) => void }) {
    const [input, setInput] = useState('')
    function submit() {
        const text = input.trim()
        if (!text || sending) return
        setInput('')
        onSend(text)
    }
    return (
        <div className="composer-box">
            <Input.TextArea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
                placeholder="给案卷问答发送消息"
                autoSize={{ minRows: 1, maxRows: 6 }}
                variant="borderless"
                className="composer-input"
            />
            <Button
                type="primary" shape="circle" icon={<SendOutlined />}
                onClick={submit} loading={sending} className="composer-send"
            />
        </div>
    )
}
