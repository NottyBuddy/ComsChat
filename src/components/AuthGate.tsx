import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase, supabaseConfigured, authEmailForId } from '../lib/supabase'
import { passwordPolicyError } from '../lib/passwordPolicy'
import { ShieldCheck, LockKeyhole, UserRound, Building2, LogIn, LoaderCircle, LogOut } from 'lucide-react'
import SupabaseWorkspace from './SupabaseWorkspace'

type Profile = { id:string; company_id:string; display_name:string; employee_code:string; role:string; active:boolean; must_change_password:boolean }
type Team = { id:string; name:string }

export default function AuthGate() {
 const [mode,setMode]=useState<'login'|'bootstrap'>('bootstrap')
 const [identifier,setIdentifier]=useState('HRH-CA-27558')
 const [password,setPassword]=useState('')
 const [displayName,setDisplayName]=useState('Mahesh Sharma')
 const [companyName,setCompanyName]=useState('HRH NEXT')
 const [profile,setProfile]=useState<Profile|null>(null)
 const [company,setCompany]=useState('')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [note,setNote]=useState('')
 const [teams,setTeams]=useState<Team[]>([])
 const [newPassword,setNewPassword]=useState('')
 const [confirmPassword,setConfirmPassword]=useState('')
 const [changingPassword,setChangingPassword]=useState(false)

 async function loadProfile() {
  if(!supabase)return
  const {data:{user},error:userError}=await supabase.auth.getUser()
  if(userError||!user){setError('Session missing. Please sign in again.');return}
  const {data,error:profileError}=await supabase.from('profiles').select('id,company_id,display_name,employee_code,role,active,must_change_password').eq('id',user.id).single()
  if(profileError||!data){setError('Account profile missing. Access denied.');await supabase.auth.signOut();return}
  if(!data.active){setError('This account is inactive.');await supabase.auth.signOut();return}
  setProfile(data as Profile)
  const {data:companyData}=await supabase.from('companies').select('name').eq('id',data.company_id).single()
  setCompany(companyData?.name||'Company workspace')
  const {data:teamData}=await supabase.from('teams').select('id,name').eq('company_id',data.company_id).order('name')
  setTeams((teamData||[]) as Team[])
  setError('')
 }
 useEffect(()=>{
  if(!supabase)return
  let alive=true
  supabase.auth.getSession().then(({data})=>{if(alive&&data.session)void loadProfile()})
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
   if(session&&alive)void loadProfile()
   else if(alive){setProfile(null);setCompany('');setTeams([])}
  })
  return ()=>{alive=false;subscription.unsubscribe()}
 },[])

 async function login(e:FormEvent){
  e.preventDefault();setBusy(true);setError('');setNote('')
  try{
   if(!supabase)throw new Error('Supabase configuration missing.')
   if(!identifier.trim()||!password)throw new Error('Both employee ID and password are required.')
   const {error}=await supabase.auth.signInWithPassword({email:authEmailForId(identifier),password})
   if(error)throw error
   await loadProfile()
  }catch(err){setError(err instanceof Error?err.message:'Login failed.')}
  finally{setBusy(false)}
 }
 async function bootstrap(e:FormEvent){
  e.preventDefault();setBusy(true);setError('');setNote('')
  try{
   if(!supabase)throw new Error('Supabase configuration missing.')
   if(identifier.trim().toUpperCase()!=='HRH-CA-27558')throw new Error('The Super Admin ID is fixed: HRH-CA-27558')
   if(displayName.trim().length<2||companyName.trim().length<2)throw new Error('Name and company name are required.')
   const policy=passwordPolicyError(password,'superadmin');if(policy)throw new Error(policy)
   const email=authEmailForId(identifier)
   // Recover safely if Auth user was created earlier but the profile RPC did not finish.
   let sessionReady=false
   const {data:signup,error:signupError}=await supabase.auth.signUp({email,password})
   if(!signupError && signup.session) sessionReady=true
   else if(signupError && /already registered|already been registered|user already exists/i.test(signupError.message)) {
    const {data:loginData,error:loginError}=await supabase.auth.signInWithPassword({email,password})
    if(loginError) throw new Error('Is ID ka Auth account pehle se bana hai, lekin diye gaye password se login nahi hua. Password check karo; account/profile ko duplicate create nahi kiya gaya.')
    sessionReady=Boolean(loginData.session)
   } else if(signupError) {
    if(/failed to fetch|network|fetch/i.test(signupError.message)) throw new Error('The browser could not reach Supabase. Check your internet connection, VPN, firewall, or browser extensions, then refresh this page. We could not confirm whether the account was created. If you try again, the app will attempt to recover an existing account before creating a new profile.')
    throw signupError
   }
   if(!sessionReady) throw new Error('No authenticated session was returned. Email confirmation must be disabled in Supabase Auth because this employee ID does not use a real email inbox.')
   const {error:rpcError}=await supabase.rpc('bootstrap_superadmin',{p_display_name:displayName.trim(),p_company_name:companyName.trim(),p_employee_code:identifier.trim()})
   if(rpcError) throw new Error('Auth sign-in ho gaya, lekin company profile setup complete nahi hua: '+rpcError.message+'. Isi ID/password se setup dobara submit karo; app existing Auth account ko recover karke profile setup continue karega.')
   await loadProfile()
  }catch(err){setError(err instanceof Error?err.message:'Setup failed.')}
  finally{setBusy(false)}
 }
 async function logout(){if(supabase)await supabase.auth.signOut();setProfile(null);setCompany('');setPassword('')}
 async function changePassword(e:FormEvent){
  e.preventDefault();setChangingPassword(true);setError('');setNote('')
  try{
   if(!supabase||!profile)throw new Error('Session missing.')
   if(newPassword!==confirmPassword)throw new Error('The passwords do not match.')
   const policy=passwordPolicyError(newPassword,profile.role==='superadmin'?'superadmin':profile.role==='admin'||profile.role==='subadmin'?profile.role:'employee')
   if(policy)throw new Error(policy)
   const {error}=await supabase.auth.updateUser({password:newPassword})
   if(error)throw error
   const {error:flagError}=await supabase.rpc('clear_own_password_change_flag')
   if(flagError)throw flagError
   setProfile({...profile,must_change_password:false});setNewPassword('');setConfirmPassword('');setNote('Password successfully changed.')
  }catch(err){setError(err instanceof Error?err.message:'Password change failed.')}
  finally{setChangingPassword(false)}
 }
 if(!supabaseConfigured)return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><ShieldCheck/> ComsChat</div><h1>Backend configuration required</h1><p>Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY for this deployment.</p></section></main>
 if(profile?.must_change_password)return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><ShieldCheck/> ComsChat</div><h1>Change temporary password</h1><p>{profile.display_name} · {profile.employee_code}</p><form onSubmit={changePassword}><label>New password</label><div className="auth-input"><LockKeyhole size={17}/><input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required/></div><label>Confirm password</label><div className="auth-input"><LockKeyhole size={17}/><input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required/></div>{error&&<div className="auth-error">{error}</div>}{note&&<div className="auth-note">{note}</div>}<button className="auth-submit" disabled={changingPassword}>{changingPassword?'Please wait…':'Update password'}</button></form><button className="auth-switch" onClick={logout}><LogOut size={15}/> Sign out</button></section></main>
 if(profile)return <div className="auth-workspace-shell"><header className="workspace-header"><div className="auth-brand"><ShieldCheck/> ComsChat</div><div><strong>{profile.display_name}</strong><span>{profile.employee_code} · {profile.role} · {company}</span><button onClick={logout}><LogOut size={15}/> Sign out</button></div></header><SupabaseWorkspace profile={profile} company={company} teams={teams}/></div>
 return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><ShieldCheck/> ComsChat</div><div className="auth-kicker">PRIVATE COMPANY MESSAGING</div><h1>{mode==='login'?'Welcome back':'Company setup'}</h1><p>{mode==='login'?'Assigned ID aur password se sign in karo.':'First Super Admin account register karo.'}</p><form onSubmit={mode==='login'?login:bootstrap}>
  <label>Login ID</label><div className="auth-input"><UserRound size={17}/><input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="HRH-CA-27558" autoComplete="username"/></div>
  {mode==='bootstrap'&&<><label>Your name</label><div className="auth-input"><UserRound size={17}/><input value={displayName} onChange={e=>setDisplayName(e.target.value)}/></div><label>Company name</label><div className="auth-input"><Building2 size={17}/><input value={companyName} onChange={e=>setCompanyName(e.target.value)}/></div></>}
  <label>Password</label><div className="auth-input"><LockKeyhole size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='bootstrap'?'Minimum 8 characters + #':'Password'} autoComplete={mode==='login'?'current-password':'new-password'}/></div>
  {error&&<div className="auth-error">{error}</div>}{note&&<div className="auth-note">{note}</div>}<button className="auth-submit" disabled={busy}>{busy?<LoaderCircle className="auth-spin" size={16}/>:mode==='login'?<LogIn size={16}/>:<ShieldCheck size={16}/>} {busy?'Please wait…':mode==='login'?'Sign in':'Create Super Admin'}</button>
 </form><button className="auth-switch" onClick={()=>{setMode(mode==='login'?'bootstrap':'login');setError('');setNote('');setPassword('')}}>{mode==='login'?'Initial setup? Create Super Admin':'Back to login'}</button><footer>Role-based password rules · Super Admin: # · Admin: @ · Agent: $</footer></section></main>
}
