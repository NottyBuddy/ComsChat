import { useState } from 'react'
import {
  Activity, ArrowRight, Bell, BriefcaseBusiness, CheckCheck, ChevronDown,
  CircleHelp, Command, FileText, LockKeyhole, MessageCircle,
  MoreHorizontal, Plus, Search, Send, ShieldCheck, Users,
  Mic, Paperclip, Smile, PanelLeftClose, Menu, Sparkles, UserRound, ArrowLeft,
} from 'lucide-react'

type View = 'personal' | 'groups' | 'admin'
const people = [
  { name: 'Aarav Mehta', role: 'Sales Executive', initials: 'AM', color: 'blue', status: 'Online', time: '10:42 AM', unread: 2, message: 'Can you share the updated client brief?' },
  { name: 'Priya Sharma', role: 'Sales Executive', initials: 'PS', color: 'violet', status: 'Online', time: '10:18 AM', unread: 0, message: 'Thanks, I have updated the sheet.' },
  { name: 'Rohan Verma', role: 'Team Lead', initials: 'RV', color: 'orange', status: 'Away', time: 'Yesterday', unread: 0, message: 'Let us connect after the review.' },
  { name: 'Neha Kapoor', role: 'Sales Executive', initials: 'NK', color: 'green', status: 'Offline', time: 'Yesterday', unread: 0, message: 'The follow-up is completed.' },
]
const messages = [
  { by: 'Aarav Mehta', text: 'Hey, do we have the latest client brief for the North region?', time: '10:36 AM', mine: false },
  { by: 'You', text: 'Yes, I am checking the updated version now.', time: '10:38 AM', mine: true },
  { by: 'Aarav Mehta', text: 'Can you share it here once it is ready?', time: '10:42 AM', mine: false },
]
const groups = [
  { name: 'Sales – Daily Updates', members: '18 members', initials: 'SD', color: 'blue', message: 'Aarav: Morning team, today’s targets are…', time: '10:45 AM', unread: 4 },
  { name: 'Campaign Coordination', members: '12 members', initials: 'CC', color: 'violet', message: 'Priya shared a campaign brief', time: 'Yesterday', unread: 0 },
]
function Avatar({ initials, color = 'blue', small = false }: { initials: string; color?: string; small?: boolean }) {
  return <div className={`avatar ${color} ${small ? 'small' : ''}`}>{initials}</div>
}
function App() {
  const [view, setView] = useState<View>('personal')
  const [active, setActive] = useState(0)
  const [message, setMessage] = useState('')
  const [showLogin, setShowLogin] = useState(true)
  const [setupDone, setSetupDone] = useState(() => localStorage.getItem('comschat-superadmin-demo') === '1')
  const [superName, setSuperName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [superPassword, setSuperPassword] = useState('')
  const [superPasswordConfirm, setSuperPasswordConfirm] = useState('')
  const [setupError, setSetupError] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [mobileConversation, setMobileConversation] = useState(false)
  const [listSearch, setListSearch] = useState('')
  const [sentPreview, setSentPreview] = useState<string[]>([])
  const selected = people[active]
  const filteredPeople = people.filter(p => (p.name + p.message).toLowerCase().includes(listSearch.toLowerCase()))
  const filteredGroups = groups.filter(g => (g.name + g.message).toLowerCase().includes(listSearch.toLowerCase()))
  const title = view === 'personal' ? selected.name : view === 'groups' ? groups[active % groups.length].name : 'Team Admin'
  const switchView = (next: View) => { setView(next); setActive(0); setSentPreview([]); setMobileConversation(false); setListSearch('') }
  const send = () => {
    if (!message.trim()) return
    setSentPreview([...sentPreview, message.trim()])
    setMessage('')
  }
  if (showLogin && !setupDone) return <main className="login-page">
    <div className="login-glow glow-one" /><div className="login-glow glow-two" />
    <div className="login-brand"><div className="brand-mark"><Command size={22}/></div><span>coms<span className="brand-accent">chat</span></span></div>
    <section className="login-card">
      <div className="eyebrow"><ShieldCheck size={14}/> FIRST-TIME COMPANY SETUP</div>
      <h1>Create your<br/><span>Super Admin</span></h1>
      <p className="login-subtitle">Pehle company workspace aur Super Admin profile create karo.</p>
      <label htmlFor="supername">Super Admin ka naam</label><div className="input-wrap"><UserRound size={17}/><input id="supername" value={superName} onChange={e=>setSuperName(e.target.value)} placeholder="Apna naam"/></div>
      <label htmlFor="companyname">Company ka naam</label><div className="input-wrap"><BriefcaseBusiness size={17}/><input id="companyname" value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Company name"/></div>
      <label>Super Admin ID</label><div className="input-wrap"><ShieldCheck size={17}/><input value="HRH-CA-27558" readOnly/></div>
      <label htmlFor="superpassword">Password</label><div className="input-wrap"><LockKeyhole size={17}/><input id="superpassword" type="password" value={superPassword} onChange={e=>setSuperPassword(e.target.value)} placeholder="Minimum 8 characters"/></div>
      <label htmlFor="superpasswordconfirm">Confirm password</label><div className="input-wrap"><LockKeyhole size={17}/><input id="superpasswordconfirm" type="password" value={superPasswordConfirm} onChange={e=>setSuperPasswordConfirm(e.target.value)} placeholder="Password dobara"/></div>
      <div className="login-error">{setupError}</div>
      <button className="primary-button login-button" onClick={()=>{if(!superName.trim()||!companyName.trim()||!superPassword){setSetupError("Saari details fill karo.");return}if(superPassword.length<8){setSetupError("Password minimum 8 characters ka ho.");return}if(superPassword!==superPasswordConfirm){setSetupError("Password match nahi kar rahe.");return}localStorage.setItem("comschat-superadmin-demo","1");localStorage.setItem("comschat-superadmin-name",superName.trim());localStorage.setItem("comschat-company-name",companyName.trim());localStorage.setItem("comschat-superadmin-id","HRH-CA-27558");setSetupError("");setSetupDone(true);setShowLogin(false)}}>Create Super Admin <ArrowRight size={17}/></button>
      <div className="login-foot"><LockKeyhole size={13}/> Demo only: details browser storage mein, real authentication backend abhi nahi hai.</div>
    </section><div className="login-bottom">COMSCHAT <span>•</span> PRIVATE COMPANY MESSAGING</div><div className="preview-note">Preview · First-time setup</div></main>
  if (setupDone && !showLogin) return <main className="login-page"><div className="login-glow glow-one"/><div className="login-glow glow-two"/>
    <div className="login-brand"><div className="brand-mark"><Command size={22}/></div><span>coms<span className="brand-accent">chat</span></span></div><section className="login-card">
      <div className="eyebrow"><ShieldCheck size={14}/> WORKSPACE CREATED</div><h1>Welcome,<br/><span>{localStorage.getItem("comschat-superadmin-name") || "Super Admin"}</span></h1>
      <p className="login-subtitle">{localStorage.getItem("comschat-company-name") || "Company"} workspace ready hai. ID note kar lo.</p>
      <div className="admin-id-box"><span>SUPER ADMIN ID</span><strong>HRH-CA-27558</strong></div>
      <button className="team-select-card" onClick={()=>alert("Abhi teams create nahi hui. Team creation next step hai.")}><Users size={22}/><strong>Team cards</strong><span>0 teams · Teams create karna next</span><ArrowRight size={16}/></button>
      <button className="primary-button login-button" onClick={()=>setShowLogin(false)}>Open Workspace <ArrowRight size={17}/></button>
      <button className="secondary-setup-button" onClick={()=>{localStorage.clear();setSetupDone(false);setShowLogin(true)}}>Reset demo setup</button>
      <div className="login-foot"><LockKeyhole size={13}/> Preview only — secure account provisioning abhi connect nahi.</div>
    </section><div className="login-bottom">COMSCHAT <span>•</span> PRIVATE COMPANY MESSAGING</div><div className="preview-note">Preview · Super Admin setup</div></main>
  if (showLogin) return <main className="login-page"><div className="login-glow glow-one"/><div className="login-glow glow-two"/>
    <div className="login-brand"><div className="brand-mark"><Command size={22}/></div><span>coms<span className="brand-accent">chat</span></span></div><section className="login-card">
      <div className="eyebrow"><ShieldCheck size={14}/> COMPANY WORKSPACE</div><h1>Your team.<br/><span>One conversation.</span></h1><p className="login-subtitle">Preview login. Authentication backend abhi connected nahi.</p>
      <label htmlFor="empid">Employee / Admin ID</label><div className="input-wrap"><UserRound size={17}/><input id="empid" placeholder="Enter your ID"/></div><label htmlFor="password">Password</label><div className="input-wrap"><LockKeyhole size={17}/><input id="password" type="password" placeholder="Enter password"/></div>
      <button className="primary-button login-button" onClick={()=>setShowLogin(false)}>Continue to workspace <ArrowRight size={17}/></button><div className="login-foot"><LockKeyhole size={13}/> Demo only</div></section>
    <div className="login-bottom">COMSCHAT <span>•</span> PRIVATE COMPANY MESSAGING</div><div className="preview-note">UI preview · Authentication not connected</div></main>
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
      <div className="sidebar-top"><div className="brand-mark"><Command size={19}/></div><span className="brand-name">coms<span className="brand-accent">chat</span></span><button className="icon-button sidebar-collapse"><PanelLeftClose size={17}/></button></div>
      <div className="workspace-switch"><div className="workspace-icon">N</div><div className="workspace-copy"><strong>Northstar Company</strong><span>Sales team workspace</span></div><ChevronDown size={15}/></div>
      <div className="sidebar-label">MESSAGES</div>
      <button className={`nav-item ${view === 'personal' ? 'selected' : ''}`} onClick={() => switchView('personal')}><MessageCircle size={18}/> Personal chat <span className="nav-count">2</span></button>
      <button className={`nav-item ${view === 'groups' ? 'selected' : ''}`} onClick={() => switchView('groups')}><Users size={18}/> Group chat <span className="nav-count">4</span></button>
      <button className={`nav-item ${view === 'admin' ? 'selected' : ''}`} onClick={() => switchView('admin')}><ShieldCheck size={18}/> Admin chat</button>
      <div className="sidebar-label second-label">WORKSPACE</div>
      <button className="nav-item"><BriefcaseBusiness size={18}/> Team directory</button>
      <button className="nav-item"><FileText size={18}/> Shared files</button>
      <div className="sidebar-spacer"/>
      <div className="sidebar-help"><div className="help-icon"><CircleHelp size={17}/></div><div><strong>Need a hand?</strong><span>Contact your team admin</span></div><ArrowRight size={15}/></div>
      <div className="profile-row"><Avatar initials="MK" color="orange" small/><div className="profile-copy"><strong>Mukku</strong><span>Employee · Sales</span></div><button className="icon-button"><MoreHorizontal size={18}/></button></div>
    </aside>
    {mobileNav && <div className="mobile-scrim" onClick={() => setMobileNav(false)}/>}
    <main className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => mobileConversation ? setMobileConversation(false) : setMobileNav(!mobileNav)}>{mobileConversation ? <ArrowLeft size={19}/> : <Menu size={19}/>}</button><div className="crumb">Workspace <span>/</span> <strong>{view === 'personal' ? 'Personal chat' : view === 'groups' ? 'Group chat' : 'Admin chat'}</strong></div></div><div className="topbar-right"><div className="secure-pill"><span/> Team space secured</div><button className="icon-button"><Search size={18}/></button><button className="icon-button notification"><Bell size={18}/><i/></button><Avatar initials="MK" color="orange" small/></div></header>
      <div className={`content-area ${mobileConversation ? "show-conversation" : ""}`}>
        <section className="chat-list-panel">
          <div className="panel-heading"><div><div className="eyebrow">YOUR TEAM</div><h2>{view === 'personal' ? 'Personal chats' : view === 'groups' ? 'Group chats' : 'Admin chat'}</h2></div><button className="icon-button add-button"><Plus size={18}/></button></div>
          <div className="list-search"><Search size={16}/><input value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="Search conversations..." /></div>
          <div className="filter-row"><button className="filter-active">All</button><button>Unread</button><button>Recent</button></div>
          {view === 'personal' ? filteredPeople.map((p) => { const i = people.indexOf(p); return <button key={p.name} className={`chat-list-item ${active === i ? 'active' : ''}`} onClick={() => {setActive(i);setMobileConversation(true)}}><Avatar initials={p.initials} color={p.color}/><div className="chat-item-copy"><div className="chat-item-top"><strong>{p.name}</strong><time>{p.time}</time></div><div className="chat-item-bottom"><span>{p.message}</span>{p.unread > 0 && <b>{p.unread}</b>}</div></div></button>}) : view === 'groups' ? filteredGroups.map((g, i) => <button key={g.name} className={`chat-list-item ${active % groups.length === i ? 'active' : ''}`} onClick={() => {setActive(i);setMobileConversation(true)}}><Avatar initials={g.initials} color={g.color}/><div className="chat-item-copy"><div className="chat-item-top"><strong>{g.name}</strong><time>{g.time}</time></div><div className="chat-item-bottom"><span>{g.message}</span>{g.unread > 0 && <b>{g.unread}</b>}</div></div></button>) : <button className="chat-list-item active" onClick={() => setMobileConversation(true)}><Avatar initials="RV" color="orange"/><div className="chat-item-copy"><div className="chat-item-top"><strong>Rohan Verma</strong><time>9:30 AM</time></div><div className="chat-item-bottom"><span>Team Admin · Sales</span></div></div></button>}
          <div className="list-footer"><span className="online-dot"/> {people.filter(p => p.status === 'Online').length} teammates online</div>
        </section>
        <section className="conversation-panel">
          <div className="conversation-header"><div className="conversation-person"><Avatar initials={view === 'personal' ? selected.initials : view === 'groups' ? 'SD' : 'RV'} color={view === 'personal' ? selected.color : 'violet'}/><div><h3>{title}</h3><span><i className="online-dot"/> {view === 'personal' ? selected.status : view === 'groups' ? '18 members · Group' : 'Team Admin · Usually replies quickly'}</span></div></div><div className="conversation-actions"><button className="icon-button"><Search size={18}/></button><button className="icon-button"><MoreHorizontal size={19}/></button></div></div>
          <div className="conversation-body"><div className="date-divider"><span>Today, 25 November</span></div>
            {view === 'personal' ? messages.map((m, i) => <div key={i} className={`message-row ${m.mine ? 'mine' : ''}`}>{!m.mine && <Avatar initials="AM" color="blue" small/>}<div className="message-content">{!m.mine && <strong>{m.by}</strong>}<div className="message-bubble">{m.text}</div><time>{m.time} {m.mine && <CheckCheck size={13}/>}</time></div></div>) : <div className="empty-chat"><div className="empty-icon"><MessageCircle size={24}/></div><strong>{view === 'groups' ? 'Welcome to your team group' : 'Your admin conversation'}</strong><p>{view === 'groups' ? 'Share updates and collaborate with everyone in your team.' : 'Use this private space to reach your team administrator.'}</p></div>}
            {sentPreview.map((m, i) => <div key={i} className="message-row mine"><div className="message-content"><div className="message-bubble">{m}</div><time>Just now <CheckCheck size={13}/></time></div></div>)}
          </div>
          <div className="composer-wrap"><div className="composer"><button className="icon-button attach"><Paperclip size={18}/></button><input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Write a message..." /><button className="icon-button"><Smile size={18}/></button><button className="icon-button"><Mic size={18}/></button><button className="send-button" onClick={send}><Send size={17}/></button></div><div className="composer-hint"><LockKeyhole size={12}/> Messages are visible only to members of your assigned team.</div></div>
        </section>
        <aside className="details-panel"><div className="details-top"><span>CONVERSATION INFO</span><button className="icon-button"><MoreHorizontal size={18}/></button></div><div className="details-profile"><Avatar initials={view === 'personal' ? selected.initials : 'SD'} color="blue"/><h3>{title}</h3><p>{view === 'personal' ? selected.role : 'Northstar · Sales team'}</p><span className="status-chip"><i className="online-dot"/> {view === 'personal' ? selected.status : 'Team workspace'}</span></div><div className="detail-separator"/><div className="detail-section"><div className="detail-title">QUICK ACTIONS</div><button><Search size={16}/> Search in conversation <ArrowRight size={14}/></button><button><Bell size={16}/> Notifications <ArrowRight size={14}/></button></div><div className="detail-separator"/><div className="detail-section"><div className="detail-title">SHARED SPACE</div><div className="shared-empty"><FileText size={19}/><span>No shared files yet</span></div></div><div className="details-bottom"><Activity size={15}/> Activity is recorded for workspace security.</div></aside>
      </div>
      <footer className="app-footer"><span>COMS<span className="brand-accent">CHAT</span> <i>•</i> COMPANY MESSAGING</span><span><LockKeyhole size={12}/> Private team workspace</span></footer>
    </main>
    <div className="demo-banner"><Sparkles size={13}/> UI preview — real login, permissions and messaging backend are not connected yet.</div>
  </div>
}
export default App
