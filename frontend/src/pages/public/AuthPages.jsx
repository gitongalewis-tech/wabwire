import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, LockKeyhole, ShieldCheck, MailCheck, KeyRound } from 'lucide-react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { api, friendlyError } from '../../services/api.js'
import { PageHero } from '../../components/Site.jsx'
import { memberHome, testMembershipMode } from '../../config/testMode.js'
import PasswordField from '../../components/PasswordField.jsx'

const authTeamImage = 'https://images.pexels.com/photos/7993903/pexels-photo-7993903.jpeg?auto=compress&cs=tinysrgb&w=1400&q=88'
const authLearningImage = 'https://images.pexels.com/photos/5940711/pexels-photo-5940711.jpeg?auto=compress&cs=tinysrgb&w=1400&q=88'

function AuthShell({ children, title, eyebrow, image, imageAlt, imageHeading, imageText }) {
  return <><PageHero compact eyebrow={eyebrow} title={title}/><section className="auth-section"><div className="auth-layout"><div className="auth-card"><Link className="auth-back-site" to="/"><ArrowLeft size={16}/> Back to website</Link>{children}</div><aside className="auth-image" role="img" aria-label={imageAlt} style={{ '--auth-image': `url("${image}")` }}><div><p className="eyebrow eyebrow--light">Wabwire Global Innovations</p><h2>{imageHeading}</h2><p>{imageText}</p></div></aside></div></section></>
}

export function LoginPage() {
  const { login } = useAuth(); const navigate = useNavigate(); const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' }); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  async function submit(event) { event.preventDefault(); setBusy(true); setError(''); try { const user = await login(form); navigate(location.state?.from || memberHome(user), { replace: true }) } catch (e) { setError(friendlyError(e)) } finally { setBusy(false) } }
  return <AuthShell eyebrow="Member access" title={<>Welcome<br/><em>back.</em></>} image={authTeamImage} imageAlt="Two African professionals discussing a project with laptops" imageHeading="Move forward, together." imageText="A place for practical tools, new skills and meaningful opportunities."><div className="auth-heading"><LockKeyhole/><div><h2>Sign in to Wabwire</h2><p>Use the email address linked to your account.</p></div></div><form className="auth-form" onSubmit={submit}><label>Email address<input type="email" autoComplete="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><PasswordField label="Password" autoComplete="current-password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><p className="auth-switch"><Link to="/forgot-password">Forgot your password?</Link> · <Link to={`/verify-email?email=${encodeURIComponent(form.email)}`}>Resend verification email</Link></p>{error&&<p className="form-error">{error}</p>}<button className="button button--gold" disabled={busy}>{busy?'Signing in…':'Sign in'}<ArrowRight size={17}/></button></form><p className="auth-switch">New to Wabwire? <Link to="/register">Create an account <ArrowUpRight size={14}/></Link></p></AuthShell>
}

export function VerifyEmailPage() {
  const [params] = useSearchParams(); const navigate = useNavigate(); const { verifyEmail } = useAuth()
  const [email, setEmail] = useState(params.get('email') || ''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('')
  useEffect(() => {
    const token = params.get('token')
    if (!token) return
    let cancelled = false
    verifyEmail(token).then(user => {
      if (!cancelled) navigate(memberHome(user), { replace: true })
    }).catch(problem => { if (!cancelled) setError(friendlyError(problem)) })
    return () => { cancelled = true }
  }, [params, verifyEmail, navigate])
  async function resend(event) { event.preventDefault(); setBusy(true); setError(''); setMessage(''); try { const result = await api('/auth/verification/resend', { method: 'POST', body: { email } }); setMessage(result.message) } catch (problem) { setError(friendlyError(problem)) } finally { setBusy(false) } }
  return <AuthShell eyebrow="Email verification" title={<>One quick<br/><em>confirmation.</em></>} image={authTeamImage} imageAlt="African professionals welcoming a new colleague" imageHeading="Your next step starts here." imageText="Confirm your email address to secure your Wabwire account."><div className="auth-heading"><MailCheck/><div><h2>Check your inbox</h2><p>{params.get('sent') === '0' ? 'Your account was created, but we could not send the verification email. Request a fresh link below or contact support.' : 'We sent a secure verification link to your email. It expires in 24 hours.'}</p></div></div>{error&&<p className="form-error" role="alert">{error}</p>}{message&&<p className="form-success" role="status">{message}</p>}<form className="auth-form" onSubmit={resend}><label>Email address<input type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)}/></label><button className="button button--gold" disabled={busy}>{busy?'Sending…':'Send a new verification link'}<ArrowRight size={17}/></button></form><p className="auth-switch">Already verified? <Link to="/login">Sign in</Link></p></AuthShell>
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('')
  async function submit(event) { event.preventDefault(); setBusy(true); setError(''); setMessage(''); try { const result = await api('/auth/forgot-password', { method: 'POST', body: { email } }); setMessage(result.message) } catch (problem) { setError(friendlyError(problem)) } finally { setBusy(false) } }
  return <AuthShell eyebrow="Account recovery" title={<>Let’s get you<br/><em>back in.</em></>} image={authTeamImage} imageAlt="African colleagues working together" imageHeading="Your account, protected." imageText="We’ll send a private password reset link if that email belongs to an account."><div className="auth-heading"><KeyRound/><div><h2>Forgot your password?</h2><p>Enter your account email to request a reset link.</p></div></div><form className="auth-form" onSubmit={submit}><label>Email address<input type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)}/></label>{error&&<p className="form-error" role="alert">{error}</p>}{message&&<p className="form-success" role="status">{message}</p>}<button className="button button--gold" disabled={busy}>{busy?'Sending…':'Send reset link'}<ArrowRight size={17}/></button></form><p className="auth-switch"><Link to="/login">Return to sign in</Link></p></AuthShell>
}

export function ResetPasswordPage() {
  const [params] = useSearchParams(); const navigate = useNavigate()
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('')
  async function submit(event) { event.preventDefault(); setError(''); setMessage(''); if (password !== confirm) return setError('The passwords do not match.'); setBusy(true); try { const result = await api('/auth/reset-password', { method: 'POST', body: { token: params.get('token'), password } }); setMessage(result.message); setTimeout(() => navigate('/login', { replace: true }), 1200) } catch (problem) { setError(friendlyError(problem)) } finally { setBusy(false) } }
  return <AuthShell eyebrow="Account recovery" title={<>Set a new<br/><em>password.</em></>} image={authTeamImage} imageAlt="African colleagues working together" imageHeading="A fresh start." imageText="Choose a strong password you have not used on another site."><div className="auth-heading"><KeyRound/><div><h2>Reset your password</h2><p>Use at least 10 characters.</p></div></div><form className="auth-form" onSubmit={submit}><PasswordField label="New password" autoComplete="new-password" minLength="10" maxLength="128" required value={password} onChange={event=>setPassword(event.target.value)}/><PasswordField label="Confirm password" autoComplete="new-password" minLength="10" maxLength="128" required value={confirm} onChange={event=>setConfirm(event.target.value)}/>{error&&<p className="form-error" role="alert">{error}</p>}{message&&<p className="form-success" role="status">{message}</p>}<button className="button button--gold" disabled={busy}>{busy?'Saving…':'Set new password'}<ArrowRight size={17}/></button></form></AuthShell>
}

function latestAdultBirthDate() {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 18)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function compressProfileImage(file) {
  const image = await createImageBitmap(file)
  const scale = Math.min(1, 640 / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  image.close()
  const data = canvas.toDataURL('image/jpeg', 0.72)
  if (data.length > 280_000) throw new Error('This image is too large after processing. Choose a smaller image.')
  return data
}

export function RegisterPage() {
  const { register } = useAuth(); const navigate = useNavigate(); const [params] = useSearchParams()
  const [form, setForm] = useState({ firstName:'', lastName:'', username:'', email:'', confirmEmail:'', phone:'', country:'Kenya', dateOfBirth:'', idPassportNumber:'', password:'', confirmPassword:'', inviterUsername:params.get('ref') || '', acceptedTerms:false, acceptedAge:false, acceptedAml:false, acceptedBusinessEffort:false, acceptedInviter:false })
  const [profileFile, setProfileFile] = useState(null); const [profilePreview, setProfilePreview] = useState(''); const [photoError, setPhotoError] = useState('')
  const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [fieldErrors,setFieldErrors]=useState([])
  useEffect(() => { if (!profileFile) { setProfilePreview(''); return } const url = URL.createObjectURL(profileFile); setProfilePreview(url); return () => URL.revokeObjectURL(url) }, [profileFile])
  function change(event) { const {name,value,type,checked}=event.target; setForm(old=>({...old,[name]:type==='checkbox'?checked:value})); setFieldErrors(old=>old.filter(issue=>issue.field!==name)); setError('') }
  function selectProfile(event) { const file=event.target.files?.[0] || null; setPhotoError(''); if (file && (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024)) { setPhotoError('Choose an image file up to 5 MB.'); event.target.value=''; return } setProfileFile(file) }
  async function submit(event) {
    event.preventDefault(); setError(''); setFieldErrors([])
    if (form.email.trim().toLowerCase() !== form.confirmEmail.trim().toLowerCase()) { setError('Please check the highlighted field.'); setFieldErrors([{field:'confirmEmail',message:'Email addresses do not match.'}]); return }
    if (form.password !== form.confirmPassword) { setError('Please check the highlighted field.'); setFieldErrors([{field:'confirmPassword',message:'Passwords do not match.'}]); return }
    setBusy(true)
    try { const profileImageData=profileFile?await compressProfileImage(profileFile):''; const result=await register({...form, profileImageData}); navigate(`/verify-email?email=${encodeURIComponent(form.email)}&sent=${result.verificationEmailSent?'1':'0'}`,{replace:true}) }
    catch(problem) { setError(problem.message||friendlyError(problem)); setFieldErrors(problem.details||[]) }
    finally { setBusy(false) }
  }
  const fieldLabel={firstName:'First name',lastName:'Last name',username:'Username',email:'Email',confirmEmail:'Confirm email',phone:'Phone number',country:'Country',dateOfBirth:'Date of birth',idPassportNumber:'ID/Passport number',password:'Password',confirmPassword:'Confirm password',inviterUsername:'Inviter username',acceptedTerms:'Terms & Conditions',acceptedAge:'Age confirmation',acceptedAml:'AML Policy',acceptedBusinessEffort:'Business results acknowledgement',acceptedInviter:'Inviter confirmation'}
  return <AuthShell eyebrow="Member registration" title={<>Create your<br/><em>member account.</em></>} image={authLearningImage} imageAlt="African and diverse students studying together with a laptop" imageHeading="Build skills. Find your next opportunity." imageText="Connect with learning, entrepreneurship and the people moving ideas forward."><div className="auth-heading"><ShieldCheck/><div><h2>Member Registration</h2><p>{testMembershipMode?'Local review is enabled. Create an account to open the dashboard without payment.':'Your account stays pending until membership payment is verified.'}</p></div></div><form className="auth-form registration-form" onSubmit={submit}>
    <div className="auth-form-grid">
      <label>First Name *<input name="firstName" required maxLength="60" autoComplete="given-name" value={form.firstName} onChange={change} aria-invalid={fieldErrors.some(issue=>issue.field==='firstName')}/></label>
      <label>Last Name *<input name="lastName" required maxLength="60" autoComplete="family-name" value={form.lastName} onChange={change} aria-invalid={fieldErrors.some(issue=>issue.field==='lastName')}/></label>
      <label className="registration-form__wide">CREATE A USERNAME *<small>Do not use spaces or symbols. This will be used as your website name.</small><input name="username" required pattern="[A-Za-z0-9]{3,30}" title="Use 3–30 letters and numbers only, with no spaces or symbols." minLength="3" maxLength="30" autoComplete="username" value={form.username} onChange={change} aria-invalid={fieldErrors.some(issue=>issue.field==='username')}/></label>
      <label>Email *<small>Only use an existing email address.</small><input name="email" type="email" required maxLength="254" autoComplete="email" value={form.email} onChange={change} aria-invalid={fieldErrors.some(issue=>issue.field==='email')}/></label>
      <label>Confirm Email *<input name="confirmEmail" type="email" required maxLength="254" autoComplete="off" value={form.confirmEmail} onChange={change} aria-invalid={fieldErrors.some(issue=>issue.field==='confirmEmail')}/></label>
      <PasswordField label="Password *" name="password" required minLength="10" maxLength="128" autoComplete="new-password" value={form.password} onChange={change} aria-invalid={fieldErrors.some(issue=>issue.field==='password')}/>
      <PasswordField label="Confirm Password *" name="confirmPassword" required minLength="10" maxLength="128" autoComplete="new-password" value={form.confirmPassword} onChange={change} aria-invalid={fieldErrors.some(issue=>issue.field==='confirmPassword')}/>
      <label>Date Of Birth *<input name="dateOfBirth" type="date" required max={latestAdultBirthDate()} value={form.dateOfBirth} onChange={change} aria-invalid={fieldErrors.some(issue=>issue.field==='dateOfBirth')}/></label>
      <label>ID/Passport No. *<input name="idPassportNumber" required minLength="4" maxLength="40" autoComplete="off" value={form.idPassportNumber} onChange={change} aria-invalid={fieldErrors.some(issue=>issue.field==='idPassportNumber')}/></label>
      <label>Country *<select name="country" required value={form.country} onChange={change}>{['Kenya','Uganda','Tanzania','Rwanda','Ethiopia','South Africa','Nigeria','Ghana','United Kingdom','United States','Canada','Other'].map(country=><option key={country}>{country}</option>)}</select></label>
      <label>Phone No. *<input name="phone" type="tel" required minLength="5" maxLength="40" autoComplete="tel" placeholder="07… or +254…" value={form.phone} onChange={change}/></label>
      <label className="registration-form__wide">* ENTER THE USERNAME OF YOUR INVITER<input name="inviterUsername" required minLength="3" maxLength="60" autoComplete="off" value={form.inviterUsername} onChange={change} aria-invalid={fieldErrors.some(issue=>issue.field==='inviterUsername')}/><small>Inviter details cannot be changed after registration.</small></label>
    </div>
    <div className="registration-profile"><div><label htmlFor="profile-upload">Profile (Optional)</label><small>Upload a profile photo (up to 5 MB).</small><input id="profile-upload" type="file" accept="image/*" onChange={selectProfile}/>{photoError&&<span className="form-error" role="alert">{photoError}</span>}</div>{profilePreview&&<img src={profilePreview} alt="Selected profile preview"/>}</div>
    <div className="policy-checks registration-consents">
      <label><input type="checkbox" name="acceptedTerms" required checked={form.acceptedTerms} onChange={change}/><span>Accept our <Link to="/legal/terms" target="_blank">Terms &amp; Conditions</Link> *</span></label>
      <label><input type="checkbox" name="acceptedAge" required checked={form.acceptedAge} onChange={change}/><span>I agree I am 18 years of age or older. *</span></label>
      <label><input type="checkbox" name="acceptedAml" required checked={form.acceptedAml} onChange={change}/><span>I acknowledge the Wabwire Anti-Money Laundering (AML) requirements. *</span></label>
      <label><input type="checkbox" name="acceptedBusinessEffort" required checked={form.acceptedBusinessEffort} onChange={change}/><span>I understand that, like any other business, building an affiliate business takes about 1–5 years of serious hard work to get reasonable results. *</span></label>
      <label><input type="checkbox" name="acceptedInviter" required checked={form.acceptedInviter} onChange={change}/><span>I confirm that I am registering under the correct inviter and understand inviter details cannot be changed. *</span></label>
    </div>
    {error&&<div className="form-error" role="alert"><b>{error}</b>{fieldErrors.length>0&&<ul>{fieldErrors.map((issue,index)=><li key={`${issue.field}-${index}`}><strong>{fieldLabel[issue.field]||issue.field}:</strong> {issue.message}</li>)}</ul>}</div>}
    <button className="button button--gold" disabled={busy}>{busy?'Creating account…':'CREATE A USERNAME / REGISTER'}<ArrowRight size={17}/></button>
  </form><p className="auth-switch">Already registered? <Link to="/login">Sign in <ArrowUpRight size={14}/></Link></p></AuthShell>
}

export function PaymentPage(){
  const {user,refresh}=useAuth();const navigate=useNavigate();const [config,setConfig]=useState(null);const [payments,setPayments]=useState([]);const [phone,setPhone]=useState(user?.phone||'');const [manual,setManual]=useState({phone:user?.phone||'',receipt:'',amount:''});const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('')
  async function load(){try{const [c,p]=await Promise.all([api('/payments/membership/config'),api('/payments/mine')]);setConfig(c);setPayments(p.payments);if(p.payments.some(x=>x.status==='VERIFIED')){await refresh();navigate('/dashboard',{replace:true})}}catch(e){setError(friendlyError(e))}}
  useEffect(()=>{load();const id=setInterval(load,7000);return()=>clearInterval(id)},[])
  async function stk(e){e.preventDefault();setBusy(true);setMessage('');setError('');try{const r=await api('/payments/membership/stk',{method:'POST',body:{phone}});setMessage(r.message);await load()}catch(e){setError(friendlyError(e))}finally{setBusy(false)}}
  async function submitManual(e){e.preventDefault();setBusy(true);setMessage('');setError('');try{const r=await api('/payments/membership/manual',{method:'POST',body:manual});setMessage(r.message);setManual({...manual,receipt:''});await load()}catch(e){setError(friendlyError(e))}finally{setBusy(false)}}
  return <><PageHero compact eyebrow="Membership payment" title={<>One step before<br/><em>member access.</em></>} text="Your member tools become available after the payment is verified."/><section className="section-pad payment-section"><div className="container payment-grid"><div className="payment-summary"><p className="eyebrow"><i/>Membership</p><h2>Membership<br/><em>activation</em></h2><div className="fee-panel"><span>One-time membership fee</span><b>KES {(config?.amount||5000).toLocaleString()}</b><small>Pay securely using M-Pesa. Wabwire will activate access after verifying payment.</small></div><div className="payment-steps"><span>01 <b>Account created</b><CheckIcon/></span><span className="active">02 <b>Payment verification</b></span><span>03 <b>Member access</b></span></div><Link className="auth-back" to="/contact"><ArrowLeft size={14}/> Need help? Contact Wabwire</Link></div><div className="payment-methods"><div className="payment-method"><div><span className="payment-number">01</span><div><h3>M-Pesa prompt</h3><p>We’ll send a secure STK Push to your phone. Enter your M-Pesa PIN to pay.</p></div></div><form className="auth-form" onSubmit={stk}><label>M-Pesa phone number<input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="07… or +254…"/></label><button className="button button--gold" disabled={busy}>{busy?'Sending request…':'Send payment request'}<ArrowRight size={17}/></button></form></div>{config?.paybill&&<div className="payment-method"><div><span className="payment-number">02</span><div><h3>Paybill payment</h3><p>Paybill <b>{config.paybill}</b> · Account <b>{user?.referralCode}</b></p></div></div><form className="auth-form" onSubmit={submitManual}><div className="auth-form-grid"><label>Phone<input required value={manual.phone} onChange={e=>setManual({...manual,phone:e.target.value})}/></label><label>Amount (KES)<input type="number" min="1" required value={manual.amount} onChange={e=>setManual({...manual,amount:e.target.value})}/></label></div><label>M-Pesa receipt code<input required minLength="6" value={manual.receipt} onChange={e=>setManual({...manual,receipt:e.target.value.toUpperCase()})} placeholder="e.g. QAB12CD34E"/></label><button className="button button--gold" disabled={busy}>{busy?'Submitting…':'Submit for verification'}<ArrowRight size={17}/></button><small className="form-help">Manual submissions remain pending until an administrator verifies them.</small></form></div>}{error&&<p className="form-error">{error}</p>}{message&&<p className="form-success">{message}</p>}<div className="payment-history"><h3>Recent payment attempts</h3>{payments.length?payments.map(p=><div key={p._id}><span>{p.method==='MPESA_STK'?'M-Pesa prompt':'Paybill'} · {new Date(p.createdAt).toLocaleString()}</span><b className={`status status--${p.status.toLowerCase()}`}>{p.status}</b></div>):<p>No payment has been submitted yet.</p>}</div></div></div></section></>
}
function CheckIcon(){return <Check className="payment-check" size={14}/>}
