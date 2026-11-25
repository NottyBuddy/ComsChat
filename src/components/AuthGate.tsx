import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase, supabaseConfigured, authEmailForId } from '../lib/supabase'
import { passwordPolicyError } from '../lib/passwordPolicy'
import { ShieldCheck, LockKeyhole, UserRound, Building2, LogIn, LoaderCircle, LogOut } from 'lucide-react'

type Profile = { id:string; company_id:string; display_name:string; employee_code:string; role:string; active:boolean; must_change_password:boolean }
type Company = { name:string }

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
  const [teams,setTeams]=useState<Array<{id:string;name:string}>>([])
  const [accountName,setAccountName]=useState('')
  const [accountRole,setAccountRole]=useState<'admin'|'subadmin'|'employee'|'agent'>('employee')
  const [accountTeam,setAccountTeam]=useState('')
  const [accountPassword,setAccountPassword]=useState('')
  const [targetCode,setTargetCode]=useState('')
  const [resetPassword,setResetPassword]=useState('')
  const [accountBusy,setAccountBusy]=useState(false)
  const [accountNote,setAccountNote]=useState('')
  const [accountError,setAccountError]=useState('')

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
      if(displayName.trim().length<2||companyName.trim().length<2){setError('Naam aur company required hain.');return}
      const passwordError=passwordPolicyError(password,'superadmin')
      if(passwordError){setError(passwordError);return}
      const {data:signup,error:signupError}=await supabase.auth.signUp({email:authEmailForId(identifier),password})
      if(signupError)throw signupError
      if(!signup.session){
        setNote('Auth signup ho gaya, lekin email confirmation enabled hai. ID-only login ke liye Supabase Auth email confirmation disable karna hoga. Synthetic email par confirmation receive nahi hoga.')
        return
      }
      const {error:rpcError}=await supabase.rpc('bootstrap_superadmin',{p_display_name:displayName.trim(),p_company_name:companyName.trim(),p_employee_code:identifier.trim()})
      if(rpcError)throw rpcError
      await loadProfile()
    }catch(err){
      const message=err instanceof Error?err.message:String(err)
      if(message==='Failed to fetch'||err instanceof TypeError){
        let diagnosis='Browser request Supabase tak nahi pahunchi.'
        try {
          const health=await fetch('https://ldpjbwewyihgpfncpumr.supabase.co/auth/v1/health',{method:'GET',cache:'no-store'})
          diagnosis='Supabase health HTTP '+health.status+'. Signup request ka browser/network/CORS path fail hua.'
        } catch {
          diagnosis='Supabase health request bhi browser se block/fail hui. Network, DNS, browser privacy/ad-blocker ya CORS path check required.'
        }
        setError(diagnosis+' Details: '+message)
      }else setError(message||'Setup failed. Please retry.')
    }
    finally{setBusy(false)}
  }

  async function logout(){if(supabase)await supabase.auth.signOut();setProfile(null);setCompany('');setPassword('');setError('')}

  if(!supabaseConfigured)return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><ShieldCheck/> ComsChat</div><h1>Backend configuration required</h1><p>Supabase Auth client is ready, but this deployment has no Supabase environment variables configured.</p><p className="auth-help">Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY on the hosting environment to activate ID/password login.</p></section></main>

  async function manageAccount(action:'create'|'reset_password') {
    setAccountBusy(true);setAccountError('');setAccountNote('')
    try {
      if(!supabase) throw new Error('Supabase configuration missing.')
      const payload = action === 'create'
        ? {action,display_name:accountName,role:accountRole,team_id:accountTeam,password:accountPassword}
        : {action,employee_code:targetCode,password:resetPassword}
      const {data,error:invokeError}=await supabase.functions.invoke('manage-comschat-account',{body:payload})
      if(invokeError) throw invokeError
      if(data?.error) throw new Error(data.error)
      if(action==='create') {
        setAccountNote('Account created. Employee ID: '+data.employee_code+'. Temporary password user ko securely share karo; first login par change required hoga.')
        setAccountName('');setAccountPassword('');setAccountTeam('')
      } else {
        setAccountNote('Password reset successful. User must change password at next login.')
        setTargetCode('');setResetPassword('')
      }
    } catch(err) { setAccountError(err instanceof Error?err.message:'Account operation failed.') }
    finally { setAccountBusy(false) }
  }

  if(profile)return <main className="auth-page"><section className="auth-card auth-success auth-workspace">
    <div className="auth-brand"><ShieldCheck/> ComsChat</div><div className="auth-avatar"><ShieldCheck size={25}/></div><h1>Workspace access verified</h1>
    <div className="auth-profile"><strong>{profile.display_name}</strong><span>{profile.employee_code} · {profile.role}</span><span>{company}</span></div>
    {profile.must_change_password && <div className="auth-note">Your account requires a password change before using the workspace. Sign out and use password recovery with your administrator until the password-change screen is enabled.</div>}
    {(profile.role==='superadmin'||profile.role==='admin') && <>
      <h2 className="auth-section-title">Create account</h2>
      <label>Employee name</label><div className="auth-input"><UserRound size={17}/><input value={accountName} onChange={e=>setAccountName(e.target.value)} placeholder="Full name"/></div>
      <label>Role</label><select className="auth-select" value={accountRole} onChange={e=>setAccountRole(e.target.value as typeof accountRole)}>{(profile.role==='superadmin'?['admin','subadmin','agent','employee']:['subadmin','agent','employee']).map(r=><option key={r} value={r}>{r.toUpperCase()}</option>)}</select>
      <label>Team</label><select className="auth-select" value={accountTeam} onChange={e=>setAccountTeam(e.target.value)}><option value="">Select team</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <label>Temporary password (min 8 characters)</label><div className="auth-input"><LockKeyhole size={17}/><input type="password" value={accountPassword} onChange={e=>setAccountPassword(e.target.value)} placeholder={accountRole==='admin'||accountRole==='subadmin'?'Must include @':accountRole==='agent'?'Must include 

  return <main className="auth-page"><section className="auth-card">
    <div className="auth-brand"><ShieldCheck/> ComsChat</div><div className="auth-kicker">PRIVATE COMPANY MESSAGING</div>
    <h1>{mode==='login'?'Welcome back':'Company setup'}</h1>
    <p>{mode==='login'?'Assigned ID aur password se sign in karo.':'First Super Admin account register karo.'}</p>
    <form onSubmit={mode==='login'?login:bootstrap}>
      <label>Login ID</label><div className="auth-input"><UserRound size={17}/><input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder={mode==='bootstrap'?'HRH-CA-27558':'Employee / Admin ID'} autoComplete="username"/></div>
      {mode==='bootstrap'&&<><label>Your name</label><div className="auth-input"><UserRound size={17}/><input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Super Admin name"/></div><label>Company name</label><div className="auth-input"><Building2 size={17}/><input value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Company name"/></div></>}
      <label>Password</label><div className="auth-input"><LockKeyhole size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='bootstrap'?'Min 8 characters + # required':'Password'} autoComplete={mode==='login'?'current-password':'new-password'}/></div>
      {error&&<div className="auth-error">{error}</div>}{note&&<div className="auth-note">{note}</div>}
      <button className="auth-submit" disabled={busy}>{busy?<LoaderCircle className="auth-spin" size={16}/>:mode==='login'?<LogIn size={16}/>:<ShieldCheck size={16}/>} {busy?'Please wait…':mode==='login'?'Sign in':'Create Super Admin'}</button>
    </form>
    <button className="auth-switch" onClick={()=>{setMode(mode==='login'?'bootstrap':'login');setError('');setNote('');setPassword('');if(mode==='login')setIdentifier('HRH-CA-27558')}}>{mode==='login'?'Initial setup? Create Super Admin':'Back to login'}</button>
    <footer>Role-based password rules · Super Admin: # · Admin: @ · Agent: $</footer>
  </section></main>
}
:'Must include 

  return <main className="auth-page"><section className="auth-card">
    <div className="auth-brand"><ShieldCheck/> ComsChat</div><div className="auth-kicker">PRIVATE COMPANY MESSAGING</div>
    <h1>{mode==='login'?'Welcome back':'Company setup'}</h1>
    <p>{mode==='login'?'Assigned ID aur password se sign in karo.':'First Super Admin account register karo.'}</p>
    <form onSubmit={mode==='login'?login:bootstrap}>
      <label>Login ID</label><div className="auth-input"><UserRound size={17}/><input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder={mode==='bootstrap'?'HRH-CA-27558':'Employee / Admin ID'} autoComplete="username"/></div>
      {mode==='bootstrap'&&<><label>Your name</label><div className="auth-input"><UserRound size={17}/><input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Super Admin name"/></div><label>Company name</label><div className="auth-input"><Building2 size={17}/><input value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Company name"/></div></>}
      <label>Password</label><div className="auth-input"><LockKeyhole size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='bootstrap'?'Min 8 characters + # required':'Password'} autoComplete={mode==='login'?'current-password':'new-password'}/></div>
      {error&&<div className="auth-error">{error}</div>}{note&&<div className="auth-note">{note}</div>}
      <button className="auth-submit" disabled={busy}>{busy?<LoaderCircle className="auth-spin" size={16}/>:mode==='login'?<LogIn size={16}/>:<ShieldCheck size={16}/>} {busy?'Please wait…':mode==='login'?'Sign in':'Create Super Admin'}</button>
    </form>
    <button className="auth-switch" onClick={()=>{setMode(mode==='login'?'bootstrap':'login');setError('');setNote('');setPassword('');if(mode==='login')setIdentifier('HRH-CA-27558')}}>{mode==='login'?'Initial setup? Create Super Admin':'Back to login'}</button>
    <footer>Role-based password rules · Super Admin: # · Admin: @ · Agent: $</footer>
  </section></main>
}
}/></div>
      <button className="auth-submit" disabled={accountBusy} onClick={()=>manageAccount('create')}>{accountBusy?'Please wait…':'Create account'}</button>
      <h2 className="auth-section-title">Reset account password</h2>
      <label>Employee / Admin ID</label><div className="auth-input"><UserRound size={17}/><input value={targetCode} onChange={e=>setTargetCode(e.target.value)} placeholder="Enter account ID"/></div>
      <label>New temporary password</label><div className="auth-input"><LockKeyhole size={17}/><input type="password" value={resetPassword} onChange={e=>setResetPassword(e.target.value)} placeholder="Role-specific character required"/></div>
      <button className="auth-submit" disabled={accountBusy} onClick={()=>manageAccount('reset_password')}>{accountBusy?'Please wait…':'Reset password'}</button>
      {accountError&&<div className="auth-error">{accountError}</div>}{accountNote&&<div className="auth-note">{accountNote}</div>}
    </>}
    <button className="auth-submit" onClick={logout}><LogOut size={16}/> Sign out</button>
  </section></main>

  return <main className="auth-page"><section className="auth-card">
    <div className="auth-brand"><ShieldCheck/> ComsChat</div><div className="auth-kicker">PRIVATE COMPANY MESSAGING</div>
    <h1>{mode==='login'?'Welcome back':'Company setup'}</h1>
    <p>{mode==='login'?'Assigned ID aur password se sign in karo.':'First Super Admin account register karo.'}</p>
    <form onSubmit={mode==='login'?login:bootstrap}>
      <label>Login ID</label><div className="auth-input"><UserRound size={17}/><input value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder={mode==='bootstrap'?'HRH-CA-27558':'Employee / Admin ID'} autoComplete="username"/></div>
      {mode==='bootstrap'&&<><label>Your name</label><div className="auth-input"><UserRound size={17}/><input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Super Admin name"/></div><label>Company name</label><div className="auth-input"><Building2 size={17}/><input value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Company name"/></div></>}
      <label>Password</label><div className="auth-input"><LockKeyhole size={17}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='bootstrap'?'Min 8 characters + # required':'Password'} autoComplete={mode==='login'?'current-password':'new-password'}/></div>
      {error&&<div className="auth-error">{error}</div>}{note&&<div className="auth-note">{note}</div>}
      <button className="auth-submit" disabled={busy}>{busy?<LoaderCircle className="auth-spin" size={16}/>:mode==='login'?<LogIn size={16}/>:<ShieldCheck size={16}/>} {busy?'Please wait…':mode==='login'?'Sign in':'Create Super Admin'}</button>
    </form>
    <button className="auth-switch" onClick={()=>{setMode(mode==='login'?'bootstrap':'login');setError('');setNote('');setPassword('');if(mode==='login')setIdentifier('HRH-CA-27558')}}>{mode==='login'?'Initial setup? Create Super Admin':'Back to login'}</button>
    <footer>Role-based password rules · Super Admin: # · Admin: @ · Agent: $</footer>
  </section></main>
}
