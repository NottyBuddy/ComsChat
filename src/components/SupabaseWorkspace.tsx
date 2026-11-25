import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Building2, MessageCircle, Users, Send, Plus, RefreshCw } from 'lucide-react'

type Profile={id:string;company_id:string;display_name:string;employee_code:string;role:string}
type Team={id:string;name:string}
type Chat={id:string;chat_type:string;title:string|null;team_id:string;created_at:string}
type Message={id:string;chat_id:string;sender_id:string;body:string;created_at:string;edited_at:string|null}
type Member={user_id:string}
type Person={id:string;display_name:string;employee_code:string;role:string}

export default function SupabaseWorkspace({profile,company,teams}:{profile:Profile;company:string;teams:Team[]}){
 const [selectedTeam,setSelectedTeam]=useState('')
 const [chats,setChats]=useState<Chat[]>([])
 const [people,setPeople]=useState<Person[]>([])
 const [messages,setMessages]=useState<Message[]>([])
 const [selectedChat,setSelectedChat]=useState('')
 const [draft,setDraft]=useState('')
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState('')
 const [teamName,setTeamName]=useState('')
 const [creatingTeam,setCreatingTeam]=useState(false)
 const [busy,setBusy]=useState(false)
 const isSuper=profile.role==='superadmin'
 const canManage=['superadmin','admin'].includes(profile.role)

 async function load(){
  if(!supabase)return
  setLoading(true);setError('')
  try{
   const [chatResult,peopleResult]=await Promise.all([
    supabase.from('chats').select('id,chat_type,title,team_id,created_at').order('created_at',{ascending:false}),
    supabase.from('profiles').select('id,display_name,employee_code,role').order('display_name')
   ])
   if(chatResult.error)throw chatResult.error
   if(peopleResult.error)throw peopleResult.error
   setChats((chatResult.data||[]) as Chat[]);setPeople((peopleResult.data||[]) as Person[])
  }catch(e){setError(e instanceof Error?e.message:'Could not load workspace data.')}
  finally{setLoading(false)}
 }
 async function loadMessages(chatId:string){
  if(!supabase)return
  const {data,error}=await supabase.from('messages').select('id,chat_id,sender_id,body,created_at,edited_at').eq('chat_id',chatId).is('deleted_at',null).order('created_at')
  if(error){setError(error.message);return}
  setMessages((data||[]) as Message[])
 }
 useEffect(()=>{void load()},[])
 useEffect(()=>{if(selectedChat)void loadMessages(selectedChat);else setMessages([])},[selectedChat])
 useEffect(()=>{
  if(!supabase||!selectedChat)return
  const channel=supabase.channel('chat-'+selectedChat).on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:'chat_id=eq.'+selectedChat},()=>void loadMessages(selectedChat)).subscribe()
  return ()=>{void supabase.removeChannel(channel)}
 },[selectedChat])
 const scopedTeams=teams.filter(t=>!selectedTeam||t.id===selectedTeam)
 const scopedChats=chats.filter(c=>!selectedTeam||c.team_id===selectedTeam)
 const activeChat=chats.find(c=>c.id===selectedChat)
 const send=async(e:FormEvent)=>{
  e.preventDefault();if(!supabase||!selectedChat||!draft.trim())return
  setBusy(true);setError('')
  try{
   const {error}=await supabase.from('messages').insert({chat_id:selectedChat,sender_id:profile.id,body:draft.trim()})
   if(error)throw error
   setDraft('')
   await loadMessages(selectedChat)
  }catch(e){setError(e instanceof Error?e.message:'Message send failed.')}
  finally{setBusy(false)}
 }
 const createTeam=async(e:FormEvent)=>{
  e.preventDefault();if(!supabase||!teamName.trim())return
  setCreatingTeam(true);setError('')
  try{
   const {data,error}=await supabase.from('teams').insert({company_id:profile.company_id,name:teamName.trim()}).select('id,name').single()
   if(error)throw error
   setTeamName('');setSelectedTeam(data.id);await load()
  }catch(e){setError(e instanceof Error?e.message:'Team creation failed.')}
  finally{setCreatingTeam(false)}
 }
 const createChat=async(type:'group'|'admin')=>{
  if(!supabase)return
  const team=scopedTeams[0]
  if(!team){setError('Pehle team create/select karo.');return}
  setBusy(true);setError('')
  try{
   const {data,error}=await supabase.from('chats').insert({company_id:profile.company_id,team_id:team.id,chat_type:type,title:type==='group'?'New group':'Admin chat',created_by:profile.id}).select('id,chat_type,title,team_id,created_at').single()
   if(error)throw error
   const {error:memberError}=await supabase.from('chat_members').insert({chat_id:data.id,user_id:profile.id})
   if(memberError)throw memberError
   setChats([data as Chat,...chats]);setSelectedChat(data.id)
  }catch(e){setError(e instanceof Error?e.message:'Chat creation failed.')}
  finally{setBusy(false)}
 }
 return <main className="real-workspace">
  <aside className="real-sidebar"><div className="real-label">COMPANY</div><div className="real-company"><Building2 size={18}/><strong>{company}</strong></div>
   <div className="real-label">TEAMS</div><select value={selectedTeam} onChange={e=>setSelectedTeam(e.target.value)}><option value="">All accessible teams</option>{teams.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select>
   {canManage&&isSuper&&<form className="real-create-team" onSubmit={createTeam}><input value={teamName} onChange={e=>setTeamName(e.target.value)} placeholder="New team name"/><button disabled={creatingTeam}><Plus size={15}/></button></form>}
   <div className="real-label">CONVERSATIONS</div>{scopedChats.map(c=><button key={c.id} className={'real-chat-link '+(selectedChat===c.id?'active':'')} onClick={()=>setSelectedChat(c.id)}><MessageCircle size={16}/><span>{c.title||c.chat_type+' chat'}</span><small>{c.chat_type}</small></button>)}
   {!loading&&scopedChats.length===0&&<p className="real-muted">No conversations yet.</p>}
   {canManage&&<div className="real-create-chat"><button onClick={()=>void createChat('group')} disabled={busy}><Plus size={15}/> New group</button><button onClick={()=>void createChat('admin')} disabled={busy}><Plus size={15}/> Admin chat</button></div>}
   <div className="real-label">PEOPLE VISIBLE TO YOU</div>{people.map(p=><div className="real-person" key={p.id}><span>{p.display_name}</span><small>{p.employee_code}</small></div>)}
  </aside>
  <section className="real-main"><div className="real-page-head"><div><div className="real-label">LIVE WORKSPACE</div><h1>{activeChat?.title||'Your conversations'}</h1><p>Real Supabase records · role-based access</p></div><button onClick={()=>void load()}><RefreshCw size={15}/> Refresh</button></div>
   {error&&<div className="auth-error">{error}</div>}
   {loading?<div className="real-empty">Loading secured workspace…</div>:!selectedChat?<div className="real-empty"><MessageCircle size={34}/><h2>No conversation selected</h2><p>{chats.length?'Choose a conversation from the left.':'Your company database is ready. Create a team and start adding real members and conversations.'}</p></div>:<><div className="real-messages">{messages.map(m=><article className={'real-message '+(m.sender_id===profile.id?'mine':'')} key={m.id}><strong>{people.find(p=>p.id===m.sender_id)?.display_name||'Member'}</strong><p>{m.body}</p><time>{new Date(m.created_at).toLocaleString()}</time></article>)}</div><form className="real-composer" onSubmit={send}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Write a message…" /><button disabled={busy||!draft.trim()}><Send size={16}/> Send</button></form></>}
  </section>
 </main>
}
