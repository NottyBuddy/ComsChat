import { FormEvent, useEffect, useState } from 'react'
import { supabase, supabaseConfigured, authEmailForId } from '../lib/supabase'
import { ShieldCheck, LockKeyhole, UserRound, Building2, LogIn, LoaderCircle, LogOut } from 'lucide-react'

type Profile = { id:string; company_id:string; display_name:string; employee_code:string; role:string; active:boolean; must_change_password:boolean }
type Company = { name:string }

export default function AuthGate() {
  const [mode,setMode]=useState<'login'|'bootstrap'>('login')
  const [identifier,setIdentifier]=useState('')
  const [password,setPassword]=useState('')
  const [displayName,setDisplayName]=useState('')
  const [companyName,setCompanyName]=useState('')
  const [profile,setProfile]=useState<Profile|null>(null)
  const [company,setCompany]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [note,setNote]=useState('')

  useEffect(()=>{
    if(!supabase)return
    let alive=true
    supabase.auth.getSession().then(async ({data})=>{
      if(data.session&&alive)await loadProfile()
    })
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(session&&alive)void loadProfile()
      else if(alive){setProfile(null);setCompany('')}
    })
    return ()=>{alive=false;subscription.unsubscribe()}
  },[])

  async function loadProfile(){
    if(!supabase)return
    const {data,error:profileError}=await supabase.from('profiles').select('id,company_id,display_name,employee_code,role,active,must_change_password').single()
    if(profileError){setError('Authenticated account is not provisioned. Access denied; contact your company administrator.');await supabase.auth.signOut();return}
    if(!data.active){setError('This account is inactive.');await supabase.auth.signOut();return}
    setProfile(data as Profile)
    const {data:companyData}=await supabase.from('companies').select('name').eq('id',data.company_id).single()
    setCompany((companyData as Company|null)?.name||'Company workspace')
    setError('')
  }

  async function login(e:FormEvent){
    e.preventDefault();setBusy(true);setError('');setNote('')
    try{
      if(!supabase){setError('Supabase configuration missing.');return}
      if(!identifier.trim()||!password){setError('ID aur password dono required hain.');return}
      const {error:authError}=await supabase.auth.signInWithPassword({email:authEmailForId(identifier),password})
      if(authError)throw authError
      await loadProfile()
    }catch(err){setError(err instanceof Error?err.message:'Login failed.')}
    finally{setBusy(false)}
  }

  async function bootstrap(e:FormEvent){
    e.preventDefault();setBusy(true);setError('');setNote('')
    try{
      if(!supabase){setError('Supabase configuration missing.');return}
      if(identifier.trim().toUpperCase()!=='HRH-CA-27558'){setError('Super Admin ID fixed hai: HRH-CA-27558');return}
      if(displayName.trim().length<2||companyName.trim().length<2||password.length<8){setError('Naam/company required hain. Password minimum 8 characters.');return}
      const {data:signup,error:signupError}=await supabase.auth.signUp({email:authEmailForId(identifier),password})
      if(signupError)throw signupError
      if(!signup.session){
        setNote('Auth signup ho gaya, lekin email confirmation enabled hai. ID-only login ke liye Supabase Auth email confirmation disable karna hoga. Synthetic email par confirmation receive nahi hoga.')
        return
      }
      const {error:rpcError}=await supabase.rpc('bootstrap_superadmin',{p_display_name:displayName.trim(),p_company_name:companyName.trim(),p_employee_code:identifier.trim()})
      if(rpcError)throw rpcError
      await loadProfile()
    }catch(err){setError(err instanceof Error?err.message:'Setup failed.')}
    finally{setBusy(false)}
  }

  async function logout(){if(supabase)await supabase.auth.signOut();setProfile(null);setCompany('');setPassword('');setError('')}

  if(!supabaseConfigured)return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><ShieldCheck/> ComsChat</div><h1>Backend configuration required</h1><p>Supabase Auth client is ready, but this deployment has no Supabase environment variables configured.</p><p className="auth-help">Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY on the hosting environment to activate ID/password login.</p></section></main>

  if(profile)return <main className="auth-page"><section className="auth-card auth-success"><div className="auth-brand"><ShieldCheck/> ComsChat</div><div className="auth-avatar"><ShieldCheck size={25}/></div><h1>Authenticated</h1><p>Login identity verified. Workspace data integration is still in progress; demo/local data is intentionally not exposed.</p><div className="auth-profile"><strong>{profile.display_name}</strong><span>{profile.employee_code} · {profile.role}</span><span>{company}</span></div><button className="auth-submit" onClick={logout}><LogOut size={16}/> Sign out</button></section></main>

  return <main className="auth-page"><section className="auth-card">
    <div className="auth-brand"><ShieldCheck/> ComsChat</div><div className="auth-kicker">PRIVATE COMPANY MESSAGING</div>
    <h1>{mode==='login'?'Welcome back':'Company setup'}</h1>
    <p>{mode==='login'?'Assigned ID aur password se sign in karo.':'First Super Admin account register karo.'}</p>
    <form onSubmit={mode==='login'?login:bootstrap}>
      <label>Login ID</label><div className="auth-input"><UserRound size={17}/><input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder={mode==='bootstrap'?'HRH-CA-27558':'Employee / Admin ID'} autoComplete="username"/></div>
      {mode==='bootstrap'&&<><label>Your name</label><div className="auth-input"><UserRound size={17}/><input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Super Admin name"/></div><label>Company name</label><div className="auth-input"><Building2 size={17}/><input value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Company name"/></div></>}
      <label>Password</label><div className="auth-input"><LockKeyhole size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='bootstrap'?'Minimum 8 characters':'Password'} autoComplete={mode==='login'?'current-password':'new-password'}/></div>
      {error&&<div className="auth-error">{error}</div>}{note&&<div className="auth-note">{note}</div>}
      <button className="auth-submit" disabled={busy}>{busy?<LoaderCircle className="auth-spin" size={16}/>:mode==='login'?<LogIn size={16}/>:<ShieldCheck size={16}/>} {busy?'Please wait…':mode==='login'?'Sign in':'Create Super Admin'}</button>
    </form>
    <button className="auth-switch" onClick={()=>{setMode(mode==='login'?'bootstrap':'login');setError('');setNote('');setPassword('');if(mode==='login')setIdentifier('HRH-CA-27558')}}>{mode==='login'?'Initial setup? Create Super Admin':'Back to login'}</button>
    <footer>Secure authentication · ID-based access</footer>
  </section></main>
}
