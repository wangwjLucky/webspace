/**
 * 修复模型输出的粘连 Markdown 表格。
 *
 * 模型常把表头、分隔行、数据行连成一行（甚至跨行折断）：
 *   | 日期 | 登记 | ... | 合计 ||------|------|...|--------
 *   -|------|| 2026-11-12 |3 |3 |3 |3 |0 |0 |12 |
 * react-markdown 认不出，会当纯文本渲染。
 *
 * 做法：把以 | 开头的行（含紧接的续行）合并成一个串 → 按 | 切 cell →
 * 找分隔段 → 按列数重建成标准 Markdown 表格。
 */

const isSeparatorCell = (c: string) => c.length > 0 && /^[:\-\s]+$/.test(c) && c.includes('-')

function rebuildTable(joined: string): string | null {
    let s = joined.replace(/\n/g, '').trim()
    if (!s.startsWith('|')) return null
    s = s.slice(1)
    if (s.endsWith('|')) s = s.slice(0, -1)

    const cells = s.split('|').map(c => c.trim())
    const sepStart = cells.findIndex(isSeparatorCell)
    if (sepStart < 1) return null

    // 表头：分隔段之前的内容，去掉因 `||` 产生的尾部空 cell
    let header = cells.slice(0, sepStart)
    while (header.length && header[header.length - 1] === '') header = header.slice(0, -1)
    const cols = header.length
    if (cols < 1) return null

    // 分隔行可能被拆成多个 cell（粘连/折断导致），全部跳过
    let i = sepStart
    while (i < cells.length && (isSeparatorCell(cells[i]) || cells[i] === '')) i++

    // 数据区：去掉因 `||`（行与行、行与分隔段相接）产生的空 cell
    // 不去掉会导致列错位（`|  | 永兴001 |` `| 39 |  |`）
    const body = cells.slice(i).filter(c => c !== '')

    if (body.length === 0 || body.length % cols !== 0) return null

    const rows: string[][] = []
    for (let k = 0; k < body.length; k += cols) rows.push(body.slice(k, k + cols))

    const sep = header.map(() => '---')
    return [header, sep, ...rows]
        .map(r => `| ${r.join(' | ')} |`)
        .join('\n')
}

export function splitEvidenceSQL(content: string): { answer: string; sql: string | null } {
    const marker = '\nSQL：\n'
    const index = content.lastIndexOf(marker)
    if (index < 0) return { answer: content, sql: null }
    return {
        answer: content.slice(0, index).trimEnd(),
        sql: content.slice(index + marker.length).trim(),
    }
}

export function repairMarkdownTables(md: string): string {
    const lines = md.split('\n')
    const out: string[] = []
    let buffer: string[] = []
    let pendingBlank: string[] = []   // 表格行之间夹的空行，若后面还接表格行则丢弃

    const flush = () => {
        if (buffer.length === 0) {
            out.push(...pendingBlank)
            pendingBlank = []
            return
        }
        const joined = buffer.join('')
        if (joined.trimStart().startsWith('|')) {
            const rebuilt = rebuildTable(joined)
            out.push(rebuilt ?? buffer.join('\n'))
        } else {
            out.push(...buffer)
        }
        out.push(...pendingBlank)
        pendingBlank = []
        buffer = []
    }

    for (const line of lines) {
        const t = line.trimStart()
        if (t.length === 0) {
            if (buffer.length > 0) pendingBlank.push(line)   // 可能是表格中间的空行，先挂起
            else out.push(line)
            continue
        }
        // 表格行：以 | 开头，或 buffer 非空且本行含 |（粘连的续行，如 `-|------|| 2026`）
        if (t.startsWith('|') || (buffer.length > 0 && t.includes('|'))) {
            pendingBlank = []          // 后面还接表格行 → 舍弃中间空行
            buffer.push(line)
            continue
        }
        flush()
        out.push(line)
    }
    flush()

    return out.join('\n')
}
