import html2pdf from 'html2pdf.js';
import type { Session, Entity, Message } from './types';
import { format } from 'date-fns';

interface SessionExportData {
  session: Session;
  messages: Message[];
  breakthroughs?: Array<{
    content: string;
    insight_type?: string;
    significance?: number;
    created_at?: string;
  }>;
}

/**
 * Escapes HTML entities to prevent XSS attacks
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateSessionHTML(data: SessionExportData): string {
  const { session, messages, breakthroughs = [] } = data;
  const sessionDate = format(new Date(session.createdAt), 'MMMM d, yyyy');
  const sessionTime = format(new Date(session.createdAt), 'h:mm a');
  
  // Group entities by type
  const entityGroups = session.entities.reduce((acc, entity) => {
    if (!acc[entity.type]) acc[entity.type] = [];
    acc[entity.type].push(entity);
    return acc;
  }, {} as Record<string, Entity[]>);

  const entityTypeColors: Record<string, string> = {
    problem: '#ef4444',
    emotion: '#8b5cf6',
    value: '#22c55e',
    action: '#3b82f6',
    friction: '#f97316',
    grease: '#06b6d4',
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
          color: #e2e8f0;
          padding: 40px;
          min-height: 100vh;
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 30px;
          border-bottom: 2px solid rgba(139, 92, 246, 0.3);
        }
        
        .logo {
          font-size: 42px;
          font-weight: 800;
          background: linear-gradient(135deg, #8b5cf6, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
          letter-spacing: 2px;
        }
        
        .tagline {
          font-size: 14px;
          color: #94a3b8;
          font-style: italic;
        }
        
        .session-meta {
          display: flex;
          justify-content: center;
          gap: 30px;
          margin-top: 20px;
          color: #94a3b8;
          font-size: 13px;
        }
        
        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .status-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(6, 182, 212, 0.3));
          border: 1px solid rgba(139, 92, 246, 0.5);
        }
        
        .section {
          margin-bottom: 40px;
        }
        
        .section-title {
          font-size: 20px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .section-title::before {
          content: '';
          width: 4px;
          height: 24px;
          background: linear-gradient(180deg, #8b5cf6, #06b6d4);
          border-radius: 2px;
        }
        
        .breakthrough-card {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.1));
          border: 1px solid rgba(139, 92, 246, 0.4);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
        }
        
        .breakthrough-card::before {
          content: '✨';
          position: absolute;
          top: 12px;
          right: 16px;
          font-size: 24px;
        }
        
        .breakthrough-content {
          font-size: 16px;
          line-height: 1.7;
          color: #f1f5f9;
        }
        
        .breakthrough-meta {
          display: flex;
          gap: 20px;
          margin-top: 16px;
          font-size: 12px;
          color: #94a3b8;
        }
        
        .significance-bar {
          width: 100px;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
          display: inline-block;
          vertical-align: middle;
          margin-left: 8px;
        }
        
        .significance-fill {
          height: 100%;
          background: linear-gradient(90deg, #8b5cf6, #06b6d4);
          border-radius: 3px;
        }
        
        .entities-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        
        .entity-group {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
        }
        
        .entity-group-title {
          font-size: 13px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .entity-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        
        .entity-list {
          list-style: none;
        }
        
        .entity-item {
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          margin-bottom: 6px;
          font-size: 14px;
        }
        
        .messages-container {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 20px;
        }
        
        .message {
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 12px;
          max-width: 85%;
        }
        
        .message-user {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1));
          border: 1px solid rgba(59, 130, 246, 0.3);
          margin-left: auto;
        }
        
        .message-assistant {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .message-role {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #94a3b8;
          margin-bottom: 6px;
        }
        
        .message-content {
          font-size: 14px;
          line-height: 1.6;
        }
        
        .footer {
          text-align: center;
          margin-top: 50px;
          padding-top: 30px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          color: #64748b;
          font-size: 12px;
        }
        
        .footer-logo {
          font-size: 18px;
          font-weight: 700;
          background: linear-gradient(135deg, #8b5cf6, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 8px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">ASPIRAL</div>
        <div class="tagline">Decision Intelligence • Breakthrough Report</div>
        <div class="session-meta">
          <div class="meta-item">📅 ${sessionDate}</div>
          <div class="meta-item">🕐 ${sessionTime}</div>
          <div class="meta-item">
            <span class="status-badge">${escapeHtml(session.status)}</span>
          </div>
        </div>
      </div>
      
      ${breakthroughs.length > 0 ? `
        <div class="section">
          <div class="section-title">Key Breakthroughs</div>
          ${breakthroughs.map((b, i) => `
            <div class="breakthrough-card">
              <div class="breakthrough-content">${escapeHtml(b.content)}</div>
              <div class="breakthrough-meta">
                ${b.insight_type ? `<span>Type: ${escapeHtml(b.insight_type)}</span>` : ''}
                ${b.significance ? `
                  <span>
                    Significance:
                    <span class="significance-bar">
                      <span class="significance-fill" style="width: ${Math.min(100, Math.max(0, b.significance * 100))}%"></span>
                    </span>
                  </span>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      ${Object.keys(entityGroups).length > 0 ? `
        <div class="section">
          <div class="section-title">Discovered Elements</div>
          <div class="entities-grid">
            ${Object.entries(entityGroups).map(([type, entities]) => `
              <div class="entity-group">
                <div class="entity-group-title">
                  <span class="entity-dot" style="background: ${entityTypeColors[type] || '#8b5cf6'}"></span>
                  ${type.charAt(0).toUpperCase() + type.slice(1)}s (${entities.length})
                </div>
                <ul class="entity-list">
                  ${entities.slice(0, 5).map(e => `
                    <li class="entity-item">${escapeHtml(e.label)}</li>
                  `).join('')}
                  ${entities.length > 5 ? `<li class="entity-item" style="color: #64748b;">+${entities.length - 5} more...</li>` : ''}
                </ul>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      ${messages.length > 0 ? `
        <div class="section">
          <div class="section-title">Conversation Journey</div>
          <div class="messages-container">
            ${messages.slice(0, 20).map(m => `
              <div class="message message-${m.role}">
                <div class="message-role">${escapeHtml(m.role)}</div>
                <div class="message-content">${escapeHtml(m.content.substring(0, 300))}${m.content.length > 300 ? '...' : ''}</div>
              </div>
            `).join('')}
            ${messages.length > 20 ? `
              <div style="text-align: center; color: #64748b; padding: 12px;">
                +${messages.length - 20} more messages...
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}
      
      <div class="footer">
        <div class="footer-logo">ASPIRAL</div>
        <div>Generated on ${format(new Date(), 'MMMM d, yyyy')} at ${format(new Date(), 'h:mm a')}</div>
        <div style="margin-top: 8px;">Decision Intelligence Platform</div>
      </div>
    </body>
    </html>
  `;
}

export async function exportSessionToPDF(data: SessionExportData): Promise<void> {
  const html = generateSessionHTML(data);
  
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  document.body.appendChild(container);

  const options = {
    margin: 0,
    filename: `aspiral-session-${data.session.id.slice(0, 8)}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      backgroundColor: '#0f0f23',
    },
    jsPDF: { 
      unit: 'mm' as const, 
      format: 'a4', 
      orientation: 'portrait' as const,
    },
  };

  try {
    await html2pdf().set(options).from(container).save();
  } finally {
    document.body.removeChild(container);
  }
}

// ─── Breakthrough Shareable Card Export ───

interface BreakthroughCardData {
  friction: string;
  grease: string;
  insight: string;
  achievedAt?: Date;
}

function generateBreakthroughCardHTML(data: BreakthroughCardData): string {
  const dateStr = format(data.achievedAt ?? new Date(), 'MMMM d, yyyy');
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 1200px;
          height: 630px;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
          color: #e2e8f0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 60px 80px;
          position: relative;
          overflow: hidden;
        }
        .glow-1 {
          position: absolute; top: -80px; right: -80px;
          width: 300px; height: 300px; border-radius: 50%;
          background: rgba(139, 92, 246, 0.25); filter: blur(80px);
        }
        .glow-2 {
          position: absolute; bottom: -80px; left: -80px;
          width: 300px; height: 300px; border-radius: 50%;
          background: rgba(6, 182, 212, 0.2); filter: blur(80px);
        }
        .header {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 40px;
        }
        .logo {
          font-size: 28px; font-weight: 800;
          background: linear-gradient(135deg, #8b5cf6, #06b6d4);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; letter-spacing: 2px;
        }
        .badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 16px; border-radius: 20px; font-size: 12px;
          font-weight: 600; text-transform: uppercase; letter-spacing: 1px;
          background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.4);
        }
        .content { display: flex; flex-direction: column; gap: 20px; flex: 1; }
        .row { display: flex; align-items: flex-start; gap: 16px; }
        .icon-box {
          flex-shrink: 0; width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; font-size: 20px;
        }
        .icon-friction { background: rgba(249, 115, 22, 0.2); border: 1px solid rgba(249, 115, 22, 0.3); }
        .icon-grease  { background: rgba(6, 182, 212, 0.2);  border: 1px solid rgba(6, 182, 212, 0.3); }
        .label {
          font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 1.5px; margin-bottom: 4px;
        }
        .label-friction { color: #f97316; }
        .label-grease  { color: #06b6d4; }
        .text { font-size: 16px; line-height: 1.5; color: #f1f5f9; }
        .insight-box {
          margin-top: 8px; padding: 24px 32px; border-radius: 16px;
          background: linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.12));
          border: 1px solid rgba(139, 92, 246, 0.25);
          text-align: center;
        }
        .insight-label {
          font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 1.5px; color: #8b5cf6; margin-bottom: 10px;
        }
        .insight-text {
          font-size: 20px; font-weight: 600; line-height: 1.4; color: #f8fafc;
        }
        .footer {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: auto; padding-top: 24px; font-size: 12px; color: #64748b;
        }
        .watermark {
          font-size: 14px; font-weight: 700;
          background: linear-gradient(135deg, #8b5cf6, #06b6d4);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      </style>
    </head>
    <body>
      <div class="glow-1"></div>
      <div class="glow-2"></div>
      <div class="header">
        <span class="logo">ASPIRAL</span>
        <span class="badge">✨ Breakthrough</span>
      </div>
      <div class="content">
        <div class="row">
          <div class="icon-box icon-friction">⚡</div>
          <div>
            <div class="label label-friction">The Friction</div>
            <div class="text">${escapeHtml(data.friction)}</div>
          </div>
        </div>
        <div class="row">
          <div class="icon-box icon-grease">💧</div>
          <div>
            <div class="label label-grease">The Grease</div>
            <div class="text">${escapeHtml(data.grease)}</div>
          </div>
        </div>
        <div class="insight-box">
          <div class="insight-label">💡 The Insight</div>
          <div class="insight-text">"${escapeHtml(data.insight)}"</div>
        </div>
      </div>
      <div class="footer">
        <span>${dateStr}</span>
        <span class="watermark">aspiral.ai</span>
      </div>
    </body>
    </html>
  `;
}

export async function exportBreakthroughCard(data: BreakthroughCardData): Promise<void> {
  const html = generateBreakthroughCardHTML(data);

  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  document.body.appendChild(container);

  const options = {
    margin: 0,
    filename: `aspiral-breakthrough-${format(data.achievedAt ?? new Date(), 'yyyy-MM-dd')}.png`,
    image: { type: 'jpeg' as const, quality: 0.95 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0f0f23',
      width: 1200,
      height: 630,
    },
    jsPDF: {
      unit: 'px' as const,
      format: [1200, 630],
      orientation: 'landscape' as const,
    },
  };

  try {
    await html2pdf().set(options).from(container).save();
  } finally {
    document.body.removeChild(container);
  }
}

export function exportSessionToCSV(data: SessionExportData): void {
  const { session, messages, breakthroughs = [] } = data;
  
  const rows: string[][] = [
    ['ASPIRAL Session Export'],
    [''],
    ['Session ID', session.id],
    ['Status', session.status],
    ['Created', format(new Date(session.createdAt), 'yyyy-MM-dd HH:mm:ss')],
    [''],
    ['BREAKTHROUGHS'],
    ['Content', 'Type', 'Significance'],
    ...breakthroughs.map(b => [
      b.content,
      b.insight_type || '',
      b.significance?.toString() || '',
    ]),
    [''],
    ['ENTITIES'],
    ['Label', 'Type'],
    ...session.entities.map(e => [e.label, e.type]),
    [''],
    ['MESSAGES'],
    ['Role', 'Content', 'Timestamp'],
    ...messages.map(m => [
      m.role,
      m.content.replace(/"/g, '""'),
      format(new Date(m.timestamp), 'yyyy-MM-dd HH:mm:ss'),
    ]),
  ];

  const csvContent = rows
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `aspiral-session-${session.id.slice(0, 8)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
