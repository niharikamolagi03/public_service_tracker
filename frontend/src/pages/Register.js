import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { FaTint, FaUser, FaUserTie, FaCheckCircle, FaArrowLeft, FaUpload, FaLock } from 'react-icons/fa';
import { ButtonSpinner } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const DEPARTMENTS = [
  { value: 'electricity', label: 'Electricity Board' },
  { value: 'water', label: 'Water Resources' },
  { value: 'road', label: 'Road & Infrastructure' },
  { value: 'garbage', label: 'Garbage Services' },
  { value: 'streetlight', label: 'Streetlight Maintenance' },
  { value: 'sewage', label: 'Sewage & Drainage' },
  { value: 'park', label: 'Parks & Public Spaces' },
  { value: 'noise', label: 'Noise Control' },
  { value: 'encroachment', label: 'Encroachment Control' },
  { value: 'police', label: 'Police Department' },
  { value: 'transport', label: 'Transport Department' },
  { value: 'health', label: 'Health Department' },
  { value: 'municipal', label: 'Municipal Corporation' },
  { value: 'other', label: 'Other' },
];

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    {children}
    {error && <p className="mt-1 text-xs text-rose-500">{error}</p>}
  </div>
);

const cls = (err) => `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 bg-sky-50/30 ${err ? 'border-rose-400' : 'border-sky-200'}`;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [screen, setScreen] = useState('select');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [citizen, setCitizen] = useState({ first_name: '', last_name: '', username: '', email: '', phone_number: '', password: '', confirm_password: '' });
  const [officer, setOfficer] = useState({ first_name: '', last_name: '', username: '', email: '', phone_number: '', password: '', confirm_password: '', employee_id: '', department: '', official_email: '' });
  const [idCard, setIdCard] = useState(null);

  const submitCitizen = async (e) => {
    e.preventDefault();
    const errs = {};
    if (citizen.password !== citizen.confirm_password) errs.confirm_password = 'Passwords do not match';
    if (citizen.password.length < 6) errs.password = 'Minimum 6 characters';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    const ok = await register({ username: citizen.username, email: citizen.email, phone_number: citizen.phone_number, password: citizen.password, first_name: citizen.first_name, last_name: citizen.last_name });
    setLoading(false);
    if (ok) navigate('/dashboard');
  };

  const submitOfficer = async (e) => {
    e.preventDefault();
    const errs = {};
    if (officer.password !== officer.confirm_password) errs.confirm_password = 'Passwords do not match';
    if (officer.password.length < 6) errs.password = 'Minimum 6 characters';
    if (!idCard) errs.id_card = 'Government ID card is required';
    if (!officer.employee_id) errs.employee_id = 'Required';
    if (!officer.department) errs.department = 'Required';
    if (!officer.official_email) errs.official_email = 'Required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(officer).forEach(([k, v]) => { if (k !== 'confirm_password') fd.append(k, v); });
      fd.append('id_card', idCard);
      await axios.post('/api/auth/register_officer/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setScreen('pending');
    } catch (err) {
      const data = err.response?.data || {};
      if (typeof data === 'object') {
        setErrors(data);
        const first = Object.values(data)[0];
        toast.error(Array.isArray(first) ? first[0] : String(first));
      } else toast.error('Registration failed');
    } finally { setLoading(false); }
  };

  if (screen === 'select') return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <FaTint className="text-3xl text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Create Account</h1>
          <p className="text-slate-500 mt-2">Choose how you want to register</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <motion.button whileHover={{ scale: 1.02 }} onClick={() => setScreen('citizen')}
            className="bg-white rounded-2xl shadow-sm p-7 text-left border-2 border-sky-100 hover:border-sky-400 transition group">
            <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-sky-200 transition">
              <FaUser className="text-xl text-sky-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Citizen</h2>
            <p className="text-sm text-slate-500 mt-1">File complaints, track status, follow issues in your area.</p>
            <div className="mt-4 space-y-1">
              {['Instant access', 'No verification needed', 'Free to use'].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-emerald-600"><FaCheckCircle />{f}</div>
              ))}
            </div>
            <div className="mt-5 w-full bg-sky-500 text-white text-sm font-medium py-2 rounded-lg text-center group-hover:bg-sky-600 transition">
              Register as Citizen →
            </div>
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} onClick={() => setScreen('officer')}
            className="bg-white rounded-2xl shadow-sm p-7 text-left border-2 border-indigo-100 hover:border-indigo-400 transition group">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-200 transition">
              <FaUserTie className="text-xl text-indigo-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Government Officer</h2>
            <p className="text-sm text-slate-500 mt-1">Manage and resolve citizen grievances for your department.</p>
            <div className="mt-4 space-y-1">
              {['ID card verification', 'Admin approval required', 'Secure access'].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-indigo-600"><FaLock />{f}</div>
              ))}
            </div>
            <div className="mt-5 w-full bg-indigo-500 text-white text-sm font-medium py-2 rounded-lg text-center group-hover:bg-indigo-600 transition">
              Register as Officer →
            </div>
          </motion.button>
        </div>
        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account? <Link to="/login" className="text-sky-600 font-medium hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );

  if (screen === 'pending') return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center border border-sky-100">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <FaUserTie className="text-4xl text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Application Submitted!</h2>
        <p className="text-slate-500 mt-3 text-sm">Your officer registration is under review. An admin will verify your ID card and approve your account.</p>
        <Link to="/login" className="mt-6 block w-full bg-sky-500 text-white py-2.5 rounded-lg font-medium hover:bg-sky-600 transition text-sm">
          Back to Login
        </Link>
      </motion.div>
    </div>
  );

  if (screen === 'citizen') return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center py-10 px-4">
      <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-sky-100">
        <button onClick={() => setScreen('select')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"><FaArrowLeft /> Back</button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center"><FaUser className="text-sky-600" /></div>
          <div><h2 className="text-xl font-bold text-slate-800">Citizen Registration</h2><p className="text-xs text-slate-500">Quick and easy — instant access</p></div>
        </div>
        <form onSubmit={submitCitizen} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name"><input className={cls()} placeholder="First name" value={citizen.first_name} onChange={e => setCitizen(p => ({ ...p, first_name: e.target.value }))} /></Field>
            <Field label="Last Name"><input className={cls()} placeholder="Last name" value={citizen.last_name} onChange={e => setCitizen(p => ({ ...p, last_name: e.target.value }))} /></Field>
          </div>
          <Field label="Username *" error={errors.username}><input required className={cls(errors.username)} placeholder="Choose a username" value={citizen.username} onChange={e => setCitizen(p => ({ ...p, username: e.target.value }))} /></Field>
          <Field label="Email *" error={errors.email}><input required type="email" className={cls(errors.email)} placeholder="your@email.com" value={citizen.email} onChange={e => setCitizen(p => ({ ...p, email: e.target.value }))} /></Field>
          <Field label="Phone Number" error={errors.phone_number}><input type="tel" className={cls(errors.phone_number)} placeholder="10-digit mobile number" value={citizen.phone_number} onChange={e => setCitizen(p => ({ ...p, phone_number: e.target.value }))} /></Field>
          <Field label="Password *" error={errors.password}><input required type="password" className={cls(errors.password)} placeholder="Min 6 characters" value={citizen.password} onChange={e => setCitizen(p => ({ ...p, password: e.target.value }))} /></Field>
          <Field label="Confirm Password *" error={errors.confirm_password}><input required type="password" className={cls(errors.confirm_password)} placeholder="Repeat password" value={citizen.confirm_password} onChange={e => setCitizen(p => ({ ...p, confirm_password: e.target.value }))} /></Field>
          <button type="submit" disabled={loading} className="w-full bg-sky-500 text-white py-2.5 rounded-lg font-medium hover:bg-sky-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <ButtonSpinner /> : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-xs text-slate-400 mt-4">Already have an account? <Link to="/login" className="text-sky-600 hover:underline">Sign in</Link></p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center py-10 px-4">
      <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 border border-sky-100">
        <button onClick={() => setScreen('select')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"><FaArrowLeft /> Back</button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center"><FaUserTie className="text-indigo-600" /></div>
          <div><h2 className="text-xl font-bold text-slate-800">Officer Registration</h2><p className="text-xs text-slate-500">Requires admin verification</p></div>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-5 text-xs text-indigo-700 flex items-start gap-2">
          <FaLock className="flex-shrink-0 mt-0.5" /> Your account will be reviewed by an administrator before access is granted.
        </div>
        <form onSubmit={submitOfficer} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name"><input className={cls()} placeholder="First name" value={officer.first_name} onChange={e => setOfficer(p => ({ ...p, first_name: e.target.value }))} /></Field>
            <Field label="Last Name"><input className={cls()} placeholder="Last name" value={officer.last_name} onChange={e => setOfficer(p => ({ ...p, last_name: e.target.value }))} /></Field>
          </div>
          <Field label="Username *" error={errors.username}><input required className={cls(errors.username)} placeholder="Choose a username" value={officer.username} onChange={e => setOfficer(p => ({ ...p, username: e.target.value }))} /></Field>
          <Field label="Personal Email *" error={errors.email}><input required type="email" className={cls(errors.email)} placeholder="personal@email.com" value={officer.email} onChange={e => setOfficer(p => ({ ...p, email: e.target.value }))} /></Field>
          <Field label="Official Email *" error={errors.official_email}><input required type="email" className={cls(errors.official_email)} placeholder="name@gov.in" value={officer.official_email} onChange={e => setOfficer(p => ({ ...p, official_email: e.target.value }))} /></Field>
          <Field label="Phone Number" error={errors.phone_number}><input type="tel" className={cls(errors.phone_number)} placeholder="10-digit mobile number" value={officer.phone_number} onChange={e => setOfficer(p => ({ ...p, phone_number: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Employee ID *" error={errors.employee_id}><input required className={cls(errors.employee_id)} placeholder="EMP-12345" value={officer.employee_id} onChange={e => setOfficer(p => ({ ...p, employee_id: e.target.value }))} /></Field>
            <Field label="Department *" error={errors.department}>
              <select required className={cls(errors.department)} value={officer.department} onChange={e => setOfficer(p => ({ ...p, department: e.target.value }))}>
                <option value="">Select...</option>
                {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Password *" error={errors.password}><input required type="password" className={cls(errors.password)} placeholder="Min 6 characters" value={officer.password} onChange={e => setOfficer(p => ({ ...p, password: e.target.value }))} /></Field>
          <Field label="Confirm Password *" error={errors.confirm_password}><input required type="password" className={cls(errors.confirm_password)} placeholder="Repeat password" value={officer.confirm_password} onChange={e => setOfficer(p => ({ ...p, confirm_password: e.target.value }))} /></Field>
          <Field label="Government ID Card *" error={errors.id_card}>
            <div onClick={() => document.getElementById('id-card-input').click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${idCard ? 'border-emerald-400 bg-emerald-50' : 'border-sky-200 hover:border-sky-400 hover:bg-sky-50'}`}>
              <input id="id-card-input" type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => setIdCard(e.target.files[0])} />
              {idCard ? <div className="flex items-center justify-center gap-2 text-emerald-600"><FaCheckCircle /><span className="text-sm font-medium">{idCard.name}</span></div>
                : <><FaUpload className="text-2xl text-slate-400 mx-auto mb-2" /><p className="text-sm text-slate-500">Click to upload Government ID Card</p><p className="text-xs text-slate-400 mt-1">PDF, JPG or PNG — max 5MB</p></>}
            </div>
          </Field>
          <button type="submit" disabled={loading} className="w-full bg-indigo-500 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <ButtonSpinner /> : 'Submit for Verification'}
          </button>
        </form>
        <p className="text-center text-xs text-slate-400 mt-4">Already have an account? <Link to="/login" className="text-sky-600 hover:underline">Sign in</Link></p>
      </motion.div>
    </div>
  );
}
