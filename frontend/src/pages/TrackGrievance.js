import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  FaBookmark, FaRegBookmark, FaQrcode, FaMapMarkerAlt,
  FaRobot, FaUser, FaUserTie, FaStar, FaComment,
  FaBolt, FaTint, FaRoad, FaTrash, FaLightbulb, FaShieldAlt,
} from 'react-icons/fa';
import { format, formatDistanceToNow } from 'date-fns';
import { PageSpinner, ButtonSpinner } from '../components/LoadingSpinner';
import { useLang } from '../contexts/LangContext';
import toast from 'react-hot-toast';

const CAT_ICONS = {
  electricity: FaBolt, water: FaTint, road: FaRoad,
  garbage: FaTrash, streetlight: FaLightbulb,
};

const STATUS_STEPS = ['filed', 'assigned', 'investigating', 'in_progress', 'resolved'];

const STATUS_MAP = {
  filed:         { key: 'submitted',         cls: 'bg-blue-100 text-blue-700'       },
  assigned:      { key: 'assignedStatus',    cls: 'bg-violet-100 text-violet-700'   },
  investigating: { key: 'underReviewStatus', cls: 'bg-amber-100 text-amber-700'     },
  in_progress:   { key: 'inProgressStatus',  cls: 'bg-cyan-100 text-cyan-700'       },
  resolved:      { key: 'resolvedStatus',    cls: 'bg-emerald-100 text-emerald-700' },
  closed:        { key: 'closedStatus',      cls: 'bg-slate-100 text-slate-600'     },
  rejected:      { key: 'rejectedStatus',    cls: 'bg-rose-100 text-rose-700'       },
  escalated:     { key: 'escalatedStatus',   cls: 'bg-orange-100 text-orange-700'   },
};

export default function TrackGrievance() {
  const { grievanceId } = useParams();
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState({ rating: 5, comments: '' });
  const [postingFeedback, setPostingFeedback] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const fetchData = async () => {
    try {
      const res = await axios.get(`/api/grievances/${grievanceId}/`);
      setData(res.data);
    } catch { toast.error(t('complaintNotFound')); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [grievanceId]); // eslint-disable-line

  const toggleFollow = async () => {
    try {
      const res = await axios.post(`/api/grievances/${grievanceId}/toggle_follow/`);
      setData(p => ({ ...p, is_following: res.data.following }));
      toast.success(res.data.following ? t('following') + '!' : 'Removed');
    } catch { toast.error('Failed'); }
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setPostingComment(true);
    try {
      const res = await axios.post(`/api/grievances/${grievanceId}/add_comment/`, { text: comment });
      setData(p => ({ ...p, comments: [...p.comments, res.data] }));
      setComment('');
    } catch { toast.error('Failed'); }
    finally { setPostingComment(false); }
  };

  const postFeedback = async () => {
    setPostingFeedback(true);
    try {
      await axios.post(`/api/grievances/${grievanceId}/submit_feedback/`, feedback);
      toast.success('Thank you!');
      setShowFeedback(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setPostingFeedback(false); }
  };

  if (loading) return <PageSpinner />;
  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-500">{t('complaintNotFound')}</p>
        <Link to="/dashboard" className="mt-3 inline-block text-violet-600 hover:underline">{t('backDashboard')}</Link>
      </div>
    </div>
  );

  const stepIdx = STATUS_STEPS.indexOf(data.status);
  const pct = data.status === 'resolved' || data.status === 'closed' ? 100
    : data.status === 'rejected' ? 0
    : Math.max(10, (stepIdx / (STATUS_STEPS.length - 1)) * 100);
  const CatIcon = CAT_ICONS[data.category] || FaShieldAlt;
  const st = STATUS_MAP[data.status] || { key: data.status, cls: 'bg-slate-100 text-slate-600' };
  const canFeedback = ['resolved', 'closed'].includes(data.status) && !data.has_feedback;

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Hero image */}
      <div className="relative h-64 bg-slate-200">
        {data.media?.[0]?.file_url
          ? <img src={data.media[0].file_url} alt={data.title} className="w-full h-full object-cover" />
          : (
            <div className="w-full h-full bg-gradient-to-br from-violet-200 to-indigo-200 flex items-center justify-center">
              <CatIcon className="text-8xl text-violet-300" />
            </div>
          )
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Title overlay */}
        <div className="absolute bottom-4 left-4 right-16">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${st.cls}`}>
              {t(st.key) || data.status}
            </span>
            <span className="text-xs text-white/70 capitalize">{data.category}</span>
          </div>
          <h1 className="text-white font-bold text-lg leading-tight line-clamp-2">{data.title}</h1>
        </div>

        {/* Action buttons */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button
            onClick={toggleFollow}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition ${
              data.is_following ? 'bg-violet-600 text-white' : 'bg-white/90 text-slate-600 hover:bg-white'
            }`}
          >
            {data.is_following ? <FaBookmark className="text-sm" /> : <FaRegBookmark className="text-sm" />}
          </button>
          <button
            onClick={() => setShowQR(true)}
            className="w-10 h-10 bg-white/90 text-slate-600 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition"
          >
            <FaQrcode className="text-sm" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-4 pt-4">
        {/* App ID + location */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-slate-400">{t('appId')}</p>
              <p className="font-mono font-bold text-violet-700 text-base">{data.grievance_id}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">{t('filed')}</p>
              <p className="text-xs font-semibold text-slate-600">{format(new Date(data.submitted_at), 'dd MMM yyyy')}</p>
            </div>
          </div>
          {data.address && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <FaMapMarkerAlt className="text-violet-400 flex-shrink-0" />
              <span>{data.address}{data.pincode ? ` — ${data.pincode}` : ''}</span>
            </div>
          )}
        </div>

        {/* Progress tracker */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold">{t('progress')}</span>
            <span className="font-bold text-violet-600">{Math.round(pct)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 mb-5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-2.5 rounded-full ${
                data.status === 'rejected' ? 'bg-rose-400'
                : data.status === 'resolved' ? 'bg-emerald-400'
                : 'bg-violet-500'
              }`}
            />
          </div>
          {/* Step dots */}
          <div className="flex justify-between">
            {STATUS_STEPS.map((s, i) => {
              const stepSt = STATUS_MAP[s] || { key: s, cls: '' };
              const done = i <= stepIdx;
              return (
                <div key={s} className="flex flex-col items-center gap-1.5">
                  <div className={`w-4 h-4 rounded-full border-2 transition-all ${
                    done ? 'bg-violet-500 border-violet-500 shadow-sm shadow-violet-200' : 'bg-white border-slate-300'
                  }`} />
                  <span className={`text-xs hidden sm:block text-center leading-tight ${done ? 'text-violet-600 font-semibold' : 'text-slate-400'}`}>
                    {t(stepSt.key) || s}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI classification */}
        {data.ai_category && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FaRobot className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-800">{t('aiClassification')}</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                <span className="capitalize font-semibold">{data.ai_category}</span>
                {' → '}
                <span className="capitalize">{data.ai_department}</span>
                {data.ai_confidence > 0 && ` · ${Math.round(data.ai_confidence * 100)}% ${t('confidence')}`}
              </p>
            </div>
          </div>
        )}

        {/* Resolution / Rejection notes */}
        {data.resolution_notes && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4">
            <p className="text-xs font-bold text-emerald-700 mb-1">{t('resolution')}</p>
            <p className="text-sm text-emerald-800">{data.resolution_notes}</p>
          </div>
        )}
        {data.rejection_reason && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4">
            <p className="text-xs font-bold text-rose-700 mb-1">{t('rejectionReason')}</p>
            <p className="text-sm text-rose-800">{data.rejection_reason}</p>
          </div>
        )}

        {/* Status Timeline */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 text-sm">{t('statusTimeline')}</h3>
          {!data.updates?.length ? (
            <p className="text-slate-400 text-sm text-center py-4">{t('noUpdates')}</p>
          ) : (
            <div className="space-y-4">
              {[...data.updates].reverse().map((u, i) => {
                const uSt = STATUS_MAP[u.new_status];
                return (
                  <div key={u.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        u.performed_by_role === 'citizen' ? 'bg-violet-100' : 'bg-indigo-100'
                      }`}>
                        {u.performed_by_role === 'citizen'
                          ? <FaUser className="text-violet-600 text-xs" />
                          : <FaUserTie className="text-indigo-600 text-xs" />
                        }
                      </div>
                      {i < data.updates.length - 1 && (
                        <div className="w-0.5 flex-1 bg-slate-100 mt-1 min-h-4" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-semibold text-slate-800">{u.performed_by_name}</span>
                        {uSt && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${uSt.cls}`}>
                            {t(uSt.key) || u.new_status}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {formatDistanceToNow(new Date(u.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{u.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
            <FaComment className="text-violet-500" /> {t('comments')} ({data.comments?.length || 0})
          </h3>
          <div className="space-y-3 mb-4">
            {data.comments?.map(c => (
              <div key={c.id} className={`p-3 rounded-2xl ${c.is_official ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-slate-800">{c.author_name}</span>
                  {c.is_official && (
                    <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full font-semibold">
                      {t('official')}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                </div>
                <p className="text-sm text-slate-700">{c.text}</p>
              </div>
            ))}
          </div>
          <form onSubmit={postComment} className="flex gap-2">
            <input
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="flex-1 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50"
              placeholder={t('addComment')}
            />
            <button
              type="submit"
              disabled={postingComment || !comment.trim()}
              className="bg-violet-600 text-white px-4 py-2.5 rounded-2xl text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-50"
            >
              {postingComment ? <ButtonSpinner /> : t('post')}
            </button>
          </form>
        </div>

        {/* Feedback */}
        {canFeedback && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <FaStar className="text-amber-400" /> {t('rateResolution')}
            </h3>
            {!showFeedback ? (
              <button
                onClick={() => setShowFeedback(true)}
                className="bg-amber-400 text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-amber-500 transition"
              >
                {t('giveFeedback')}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(r => (
                    <button
                      key={r}
                      onClick={() => setFeedback(p => ({ ...p, rating: r }))}
                      className={`text-3xl transition ${feedback.rating >= r ? 'text-amber-400' : 'text-slate-200'}`}
                    >★</button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={feedback.comments}
                  onChange={e => setFeedback(p => ({ ...p, comments: e.target.value }))}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-slate-50"
                  placeholder={t('howResolution')}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFeedback(false)}
                    className="px-4 py-2.5 border border-slate-200 rounded-2xl text-sm text-slate-600 hover:bg-slate-50 transition"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={postFeedback}
                    disabled={postingFeedback}
                    className="bg-amber-400 text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-amber-500 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {postingFeedback ? <ButtonSpinner /> : t('submit')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Existing feedback */}
        {data.feedback && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <FaStar className="text-amber-400" /> {t('citizenFeedback')}
            </h3>
            <div className="flex gap-0.5 mb-2">
              {[1, 2, 3, 4, 5].map(r => (
                <span key={r} className={`text-2xl ${r <= data.feedback.rating ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
              ))}
            </div>
            {data.feedback.comments && <p className="text-sm text-slate-600">{data.feedback.comments}</p>}
          </div>
        )}
      </div>

      {/* QR Modal */}
      {showQR && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-xs w-full text-center shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <FaQrcode className="text-2xl text-violet-600" />
            </div>
            <p className="font-mono text-xs text-slate-400 mb-0.5">{data.grievance_id}</p>
            <p className="font-bold text-slate-800 mb-4 text-sm line-clamp-2">{data.title}</p>
            {data.qr_code_url
              ? <img src={data.qr_code_url} alt="QR" className="w-44 h-44 mx-auto rounded-2xl border-2 border-slate-100" />
              : (
                <div className="w-44 h-44 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center">
                  <FaQrcode className="text-6xl text-slate-300" />
                </div>
              )
            }
            <p className="text-xs text-slate-400 mt-3">{t('scanToTrack')}</p>
            <button
              onClick={() => setShowQR(false)}
              className="mt-4 w-full bg-violet-600 text-white py-2.5 rounded-2xl text-sm font-bold hover:bg-violet-700 transition"
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
