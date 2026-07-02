import { reactive } from 'vue'
import { DB } from '../db/index.js'
import { Device } from '../utils/device.js'

export function freshData() {
  return {
    positions: [
      { id: 'pos_president', name: 'SBO President', order: 1, maxVote: 1, type: 'sbo' },
      { id: 'pos_vp', name: 'Vice President', order: 2, maxVote: 1, type: 'sbo' },
      { id: 'pos_secretary', name: 'Secretary', order: 3, maxVote: 1, type: 'sbo' },
      { id: 'pos_treasurer', name: 'Treasurer', order: 4, maxVote: 1, type: 'sbo' },
      { id: 'pos_auditor', name: 'Auditor', order: 5, maxVote: 1, type: 'sbo' },
      { id: 'pos_pro', name: 'P.R.O.', order: 6, maxVote: 1, type: 'sbo' },
      { id: 'pos_male_sgt', name: 'Male Sergeant at Arms', order: 7, maxVote: 1, type: 'sbo' },
      { id: 'pos_female_sgt', name: 'Female Sergeant at Arms', order: 8, maxVote: 1, type: 'sbo' },
      { id: 'pos_g710_rep', name: 'Grade 7-10 Representative', order: 9, maxVote: 2, type: 'sbo', filterByGrade: true },
      { id: 'pos_chinese_rep', name: 'Chinese Representative', order: 10, maxVote: 1, type: 'sbo' },
    ],
    candidates: [],
    voters: [],
    votes: [],
    votedDevices: [],
    reports: [],
    settings: {
      title: 'SBO Election',
      sboActive: true,
      classroomActive: true,
      clubActive: true,
      adminPassword: 'admin123',
      grades: ['7', '8', '9', '10'],
      sectionsByGrade: {
        '7': ['Pine', 'Molave'],
        '8': ['Cypress'],
        '9': ['Kamagong', 'Mahogany'],
        '10': ['Acacia', 'Yakal'],
      },
      clubs: ['English Club', 'Science Club', 'Math Club'],
    },
  }
}

export const state = reactive({
  year: String(new Date().getFullYear()),
  years: [],
  data: null,
  loading: true,
  isDark: document.documentElement.getAttribute('data-theme') === 'dark',
  voter: { name: '', grade: '7', section: '' },
  electionType: 'sbo',
  selectedVotes: {},
  loginError: '',
  adminPass: '',
  adminLoginError: '',
  adminView: 'dashboard',
  isAdmin: false,
  candTabPosId: null,
  candTabType: 'sbo',
  logFilter: { grade: '', section: '' },
  settingsForm: { title: '', adminPassword: '', sboActive: true, classroomActive: true, clubActive: true, gradesStr: '', sectionsByGradeStr: {}, clubsStr: '' },
})

export function toggleTheme() {
  state.isDark = !state.isDark
  const t = state.isDark ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', t)
  localStorage.setItem('sbo_theme', t)
}

export function getPositions() {
  return state.data ? [...state.data.positions].sort((a, b) => a.order - b.order) : []
}

export function getPositionsByType(type) {
  return getPositions().filter(p => (p.type || 'sbo') === type)
}

export function getCandidates(posId) {
  return state.data ? state.data.candidates.filter(c => c.positionId === posId) : []
}

export function getAllCandidates() {
  return state.data ? [...state.data.candidates] : []
}

export function getSettings() {
  return state.data ? state.data.settings : {}
}

export function getVoters() {
  return state.data ? [...state.data.voters] : []
}

export function getVotes() {
  return state.data ? [...state.data.votes] : []
}

export function getStats() {
  if (!state.data) return { totalVoters: 0, totalVotes: 0, positions: {} }
  const positions = getPositions()
  const s = { totalVoters: state.data.voters.length, totalVotes: state.data.votes.length, positions: {} }
  positions.forEach(p => {
    const votes = state.data.votes.filter(v => v.positionId === p.id)
    const candidates = state.data.candidates.filter(c => c.positionId === p.id)
    s.positions[p.id] = {
      name: p.name, totalVotes: votes.length,
      candidates: candidates.map(c => ({ ...c, votes: votes.filter(v => v.candidateId === c.id).length })).sort((a, b) => b.votes - a.votes)
    }
  })
  return s
}

export function getFilteredVotes(filters = {}) {
  if (!state.data) return []
  let voters = [...state.data.voters]
  if (filters.grade) voters = voters.filter(v => v.grade === filters.grade)
  if (filters.section) voters = voters.filter(v => v.section === filters.section)
  const ids = new Set(voters.map(v => v.id))
  return state.data.votes.filter(v => ids.has(v.voterId)).map(v => {
    const voter = state.data.voters.find(x => x.id === v.voterId) || {}
    const candidate = state.data.candidates.find(x => x.id === v.candidateId) || {}
    const position = state.data.positions.find(x => x.id === v.positionId) || {}
    return { voterName: voter.name || '', grade: voter.grade || '', section: voter.section || '', candidateName: candidate.name || '', positionName: position.name || '', timestamp: v.timestamp }
  })
}

export function getSections(grade) {
  return state.data?.settings?.sectionsByGrade?.[grade] || []
}

export function getAllSections() {
  if (!state.data) return []
  const all = []
  const g = state.data.settings.grades || []
  g.forEach(g => { (state.data.settings.sectionsByGrade?.[g] || []).forEach(s => { if (!all.includes(s)) all.push(s) }) })
  return all
}

export function getClubs() {
  return state.data?.settings?.clubs || []
}

export function getReports() {
  return state.data?.reports ? [...state.data.reports].reverse() : []
}

export async function submitReport(name, message) {
  if (!state.data || !message?.trim()) return
  if (!state.data.reports) state.data.reports = []
  state.data.reports.push({
    id: 'rpt_' + Date.now(),
    name: name?.trim() || 'Anonymous',
    message: message.trim(),
    electionType: state.electionType || '',
    deviceId: Device.getId(),
    resolved: false,
    reply: '',
    replyTimestamp: '',
    followUps: [],
    timestamp: new Date().toISOString()
  })
  await saveSync()
}

export function followUpReport(id, message) {
  const r = state.data?.reports?.find(x => x.id === id)
  if (r) {
    r.followUps = r.followUps || []
    r.followUps.push({ message: message.trim(), timestamp: new Date().toISOString() })
    saveSync()
  }
}

export function resolveReport(id) {
  const r = state.data?.reports?.find(x => x.id === id)
  if (r) { r.resolved = !r.resolved; if (state.data.reports) saveSync() }
}

export function replyToReport(id, reply) {
  const r = state.data?.reports?.find(x => x.id === id)
  if (r) { r.reply = reply?.trim() || ''; r.replyTimestamp = r.reply ? new Date().toISOString() : ''; if (state.data.reports) saveSync() }
}

export function removeReport(id) {
  if (state.data?.reports) { state.data.reports = state.data.reports.filter(x => x.id !== id); saveSync() }
}

export function editReport(id, fields) {
  const r = state.data?.reports?.find(x => x.id === id)
  if (r) { Object.assign(r, fields); saveSync() }
}

export function deviceVoted() {
  if (!state.data) return false
  const key = Device.getId() + ':' + state.electionType
  return state.data.votedDevices.includes(key)
}

export function deviceVotedAny() {
  if (!state.data) return false
  return state.data.votedDevices.some(d => d.startsWith(Device.getId() + ':'))
}

export async function saveSync() {
  if (state.data) {
    try { await DB.save(state.year, state.data) }
    catch (e) { console.error('saveSync failed:', e) }
  }
}

async function loadYear(year) {
  let data = await DB.get(year)
  if (!data) {
    data = freshData()
    await DB.save(year, data)
  }
  if (!data.settings.clubs) data.settings.clubs = ['English Club', 'Science Club', 'Math Club']
  if (!data.reports) data.reports = []
  state.year = year
  state.data = data
  state.years = await DB.list()
  const s = data.settings
  state.voter = { name: '', grade: s.grades[0] || '7', section: (s.sectionsByGrade?.[s.grades[0]] || [''])[0] || '', club: (s.clubs || [])[0] || '' }
  state.electionType = 'sbo'
  state.candTabType = 'sbo'
  state.selectedVotes = {}
  state.loginError = ''
  state.logFilter = { grade: '', section: '' }
}

export async function initApp() {
  try {
    await DB.open()
    state.years = await DB.list()
    const target = state.years.includes(state.year) ? state.year : (state.years[state.years.length - 1] || state.year)
    await loadYear(target)
    if (sessionStorage.getItem('sbo_admin')) {
      state.isAdmin = true
      state.adminView = sessionStorage.getItem('sbo_adminView') || 'dashboard'
    }
  } catch (e) {
    console.error('initApp failed:', e)
    /* If no data loaded, create fresh data so the UI isn't blank */
    if (!state.data) {
      state.data = freshData()
      state.year = String(new Date().getFullYear())
    }
  }
  state.loading = false
}

export async function switchYear(year) {
  state.loading = true
  await loadYear(year)
  state.adminView = 'dashboard'
  state.loading = false
}

export async function createNewYear(year) {
  if (!year || state.years.includes(year)) { alert('Year already exists or invalid.'); return }
  state.loading = true
  await DB.save(year, freshData())
  await loadYear(year)
  state.loading = false
}

export async function deleteAndSwitch(year) {
  await DB.remove(year)
  const yrs = await DB.list()
  if (yrs.length) await switchYear(yrs[yrs.length - 1])
  else await switchYear(String(new Date().getFullYear()))
}
