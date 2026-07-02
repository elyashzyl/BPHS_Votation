import { reactive } from "vue";
import { DB } from "../db/index.js";
import { Device } from "../utils/device.js";
import {
  activePositions,
  archiveOrDeleteCandidate,
  archiveOrDeletePosition,
  makeId,
  restoreCandidate as restoreCandidateRecord,
  restorePosition as restorePositionRecord,
  scopedCandidates,
  tallyResults,
  validateBallotSelections,
  validateCandidateInput,
  validatePositionInput,
} from "../utils/electionIntegrity.js";

function defaultPositions() {
  return [
    {
      id: "pos_sbo_president",
      name: "SBO President",
      order: 1,
      maxVote: 1,
      type: "sbo",
    },
    {
      id: "pos_sbo_vp",
      name: "Vice President",
      order: 2,
      maxVote: 1,
      type: "sbo",
    },
    {
      id: "pos_sbo_secretary",
      name: "Secretary",
      order: 3,
      maxVote: 1,
      type: "sbo",
    },
    {
      id: "pos_sbo_treasurer",
      name: "Treasurer",
      order: 4,
      maxVote: 1,
      type: "sbo",
    },
    {
      id: "pos_sbo_auditor",
      name: "Auditor",
      order: 5,
      maxVote: 1,
      type: "sbo",
    },
    { id: "pos_sbo_pro", name: "P.R.O.", order: 6, maxVote: 1, type: "sbo" },
    {
      id: "pos_sbo_male_sgt",
      name: "Male Sergeant at Arms",
      order: 7,
      maxVote: 1,
      type: "sbo",
    },
    {
      id: "pos_sbo_female_sgt",
      name: "Female Sergeant at Arms",
      order: 8,
      maxVote: 1,
      type: "sbo",
    },
    {
      id: "pos_sbo_g710_rep",
      name: "Grade 7-10 Representative",
      order: 9,
      maxVote: 2,
      type: "sbo",
      filterByGrade: true,
    },
    {
      id: "pos_sbo_chinese_rep",
      name: "Chinese Representative",
      order: 10,
      maxVote: 1,
      type: "sbo",
    },
    {
      id: "pos_classroom_president",
      name: "Class President",
      order: 1,
      maxVote: 1,
      type: "classroom",
    },
    {
      id: "pos_classroom_vp",
      name: "Class Vice President",
      order: 2,
      maxVote: 1,
      type: "classroom",
    },
    {
      id: "pos_classroom_secretary",
      name: "Class Secretary",
      order: 3,
      maxVote: 1,
      type: "classroom",
    },
    {
      id: "pos_classroom_treasurer",
      name: "Class Treasurer",
      order: 4,
      maxVote: 1,
      type: "classroom",
    },
    {
      id: "pos_classroom_pro",
      name: "Class P.R.O.",
      order: 5,
      maxVote: 1,
      type: "classroom",
    },
    {
      id: "pos_club_president",
      name: "Club President",
      order: 1,
      maxVote: 1,
      type: "club",
    },
    {
      id: "pos_club_vp",
      name: "Club Vice President",
      order: 2,
      maxVote: 1,
      type: "club",
    },
    {
      id: "pos_club_secretary",
      name: "Club Secretary",
      order: 3,
      maxVote: 1,
      type: "club",
    },
    {
      id: "pos_club_treasurer",
      name: "Club Treasurer",
      order: 4,
      maxVote: 1,
      type: "club",
    },
  ];
}

function defaultSettings() {
  return {
    title: "SBO Election",
    sboActive: true,
    classroomActive: true,
    clubActive: true,
    adminPassword: "admin123",
    grades: ["7", "8", "9", "10"],
    sectionsByGrade: {
      7: ["Pine", "Molave"],
      8: ["Cypress"],
      9: ["Kamagong", "Mahogany"],
      10: ["Acacia", "Yakal"],
    },
    clubs: ["English Club", "Science Club", "Math Club"],
  };
}

export function freshData() {
  return {
    positions: defaultPositions(),
    candidates: [],
    voters: [],
    votes: [],
    votedDevices: [],
    reports: [],
    settings: defaultSettings(),
    adminAuthRequired: false,
  };
}

function normalizeData(data) {
  const fresh = freshData();
  const normalized = {
    ...fresh,
    ...data,
    settings: { ...fresh.settings, ...(data?.settings || {}) },
  };

  normalized.positions = Array.isArray(normalized.positions)
    ? normalized.positions
    : [];
  normalized.candidates = Array.isArray(normalized.candidates)
    ? normalized.candidates
    : [];
  normalized.voters = Array.isArray(normalized.voters) ? normalized.voters : [];
  normalized.votes = Array.isArray(normalized.votes) ? normalized.votes : [];
  normalized.votedDevices = Array.isArray(normalized.votedDevices)
    ? normalized.votedDevices
    : [];
  normalized.reports = Array.isArray(normalized.reports)
    ? normalized.reports
    : [];
  normalized.settings.grades = Array.isArray(normalized.settings.grades)
    ? normalized.settings.grades
    : fresh.settings.grades;
  normalized.settings.sectionsByGrade =
    normalized.settings.sectionsByGrade || fresh.settings.sectionsByGrade;
  normalized.settings.clubs = Array.isArray(normalized.settings.clubs)
    ? normalized.settings.clubs
    : fresh.settings.clubs;

  const defaultByType = defaultPositions().reduce((grouped, position) => {
    grouped[position.type] = grouped[position.type] || [];
    grouped[position.type].push(position);
    return grouped;
  }, {});

  Object.entries(defaultByType).forEach(([type, positions]) => {
    const hasType = normalized.positions.some(
      (position) => (position.type || "sbo") === type,
    );
    if (!hasType) {
      normalized.positions.push(...positions);
    }
  });

  normalized.positions.forEach((position) => {
    position.type = position.type || "sbo";
    position.order = Number(position.order) || 1;
    position.maxVote = Math.max(1, Number(position.maxVote) || 1);
    if (
      position.type === "sbo" &&
      /grade/i.test(position.name) &&
      /representative/i.test(position.name)
    ) {
      position.filterByGrade = true;
    } else if (position.filterByGrade !== true) {
      delete position.filterByGrade;
    }
    position.archived = !!position.archived;
    position.archivedAt = position.archivedAt || "";
  });

  normalized.candidates.forEach((candidate) => {
    candidate.archived = !!candidate.archived;
    candidate.archivedAt = candidate.archivedAt || "";
  });

  return normalized;
}

export const state = reactive({
  year: String(new Date().getFullYear()),
  years: [],
  data: null,
  loading: true,
  isDark: document.documentElement.getAttribute("data-theme") === "dark",
  voter: { name: "", grade: "7", section: "", club: "" },
  electionType: "sbo",
  selectedVotes: {},
  loginError: "",
  adminPass: "",
  adminLoginError: "",
  adminEmail: "",
  adminSetupWarning: "",
  adminView: "dashboard",
  isAdmin: false,
  candTabPosId: null,
  candTabType: "sbo",
  logFilter: { grade: "", section: "" },
  settingsForm: {
    title: "",
    adminPassword: "",
    sboActive: true,
    classroomActive: true,
    clubActive: true,
    gradesStr: "",
    sectionsByGradeStr: {},
    clubsStr: "",
  },
});

export function toggleTheme() {
  state.isDark = !state.isDark;
  const t = state.isDark ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("sbo_theme", t);
}

export function getPositions() {
  return state.data
    ? [...state.data.positions].sort(
        (a, b) =>
          (a.type || "sbo").localeCompare(b.type || "sbo") || a.order - b.order,
      )
    : [];
}

export function getActivePositions(type = state.electionType) {
  return activePositions(state.data, type);
}

export function getPositionsByType(type) {
  return getPositions().filter((p) => (p.type || "sbo") === type);
}

export function getCandidates(posId) {
  return state.data
    ? state.data.candidates.filter((c) => c.positionId === posId)
    : [];
}

export function getActiveCandidates(posId, voter = state.voter) {
  const position = state.data?.positions?.find((item) => item.id === posId);
  return position ? scopedCandidates(state.data, position, voter) : [];
}

export function getAllCandidates() {
  return state.data ? [...state.data.candidates] : [];
}

export function getSettings() {
  return state.data ? state.data.settings : defaultSettings();
}

export function getVoters() {
  return state.data
    ? [...state.data.voters].sort(
        (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0),
      )
    : [];
}

export function getVotes() {
  return state.data ? [...state.data.votes] : [];
}

export function getStats() {
  if (!state.data)
    return { totalVoters: 0, totalVotes: 0, positions: {}, byType: {} };
  const positions = getPositions();
  const byType = ["sbo", "classroom", "club"].reduce((carry, type) => {
    const voters = state.data.voters.filter(
      (v) => (v.electionType || "sbo") === type,
    );
    const voterIds = new Set(voters.map((v) => v.id));
    carry[type] = {
      voters: voters.length,
      votes: state.data.votes.filter((v) => voterIds.has(v.voterId)).length,
      positions: positions.filter((p) => (p.type || "sbo") === type).length,
      candidates: state.data.candidates.filter((candidate) =>
        positions.some(
          (position) =>
            position.id === candidate.positionId &&
            (position.type || "sbo") === type,
        ),
      ).length,
    };
    return carry;
  }, {});
  const s = {
    totalVoters: state.data.voters.length,
    totalVotes: state.data.votes.length,
    positions: tallyResults(state.data),
    byType,
  };
  return s;
}

export function getFilteredVotes(filters = {}) {
  if (!state.data) return [];
  let voters = [...state.data.voters];
  if (filters.grade) voters = voters.filter((v) => v.grade === filters.grade);
  if (filters.section)
    voters = voters.filter((v) => v.section === filters.section);
  const ids = new Set(voters.map((v) => v.id));
  return state.data.votes
    .filter((v) => ids.has(v.voterId))
    .map((v) => {
      const voter = state.data.voters.find((x) => x.id === v.voterId) || {};
      const candidate =
        state.data.candidates.find((x) => x.id === v.candidateId) || {};
      const position =
        state.data.positions.find((x) => x.id === v.positionId) || {};
      return {
        voterName: voter.name || "",
        grade: voter.grade || "",
        section: voter.section || "",
        candidateName: candidate.name || "",
        positionName: position.name || "",
        timestamp: v.timestamp,
      };
    });
}

export function getSections(grade) {
  return state.data?.settings?.sectionsByGrade?.[grade] || [];
}

export function getAllSections() {
  if (!state.data) return [];
  const all = [];
  const g = state.data.settings.grades || [];
  g.forEach((g) => {
    (state.data.settings.sectionsByGrade?.[g] || []).forEach((s) => {
      if (!all.includes(s)) all.push(s);
    });
  });
  return all;
}

export function getClubs() {
  return state.data?.settings?.clubs || [];
}

export function getReports() {
  return state.data?.reports
    ? [...state.data.reports].sort(
        (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0),
      )
    : [];
}

export async function createPosition(fields) {
  if (!state.data) return { ok: false, error: "Election data is not loaded." };
  const validation = validatePositionInput(fields);
  if (!validation.ok) return validation;

  state.data.positions.push({
    id: makeId("pos"),
    ...validation.value,
    archived: false,
    archivedAt: "",
  });
  await saveSync();
  return { ok: true };
}

export async function updatePosition(id, fields) {
  if (!state.data) return { ok: false, error: "Election data is not loaded." };
  const target = state.data.positions.find((position) => position.id === id);
  if (!target) return { ok: false, error: "Position not found." };

  const validation = validatePositionInput(fields);
  if (!validation.ok) return validation;

  Object.assign(target, validation.value);
  await saveSync();
  return { ok: true };
}

export async function removePosition(id) {
  const result = archiveOrDeletePosition(state.data, id);
  await saveSync();
  return { ok: true, ...result };
}

export async function restorePosition(id) {
  restorePositionRecord(state.data, id);
  await saveSync();
  return { ok: true };
}

export async function removePositions(ids) {
  const summary = { archived: 0, deleted: 0 };
  ids.forEach((id) => {
    const result = archiveOrDeletePosition(state.data, id);
    if (result.action === "archived") summary.archived++;
    if (result.action === "deleted") summary.deleted++;
  });
  await saveSync();
  return { ok: true, ...summary };
}

export async function createCandidate(fields) {
  if (!state.data) return { ok: false, error: "Election data is not loaded." };
  const validation = validateCandidateInput(state.data, fields);
  if (!validation.ok) return validation;

  state.data.candidates.push({
    id: makeId("cand"),
    ...validation.value,
    archived: false,
    archivedAt: "",
  });
  await saveSync();
  return { ok: true };
}

export async function updateCandidate(id, fields) {
  if (!state.data) return { ok: false, error: "Election data is not loaded." };
  const target = state.data.candidates.find((candidate) => candidate.id === id);
  if (!target) return { ok: false, error: "Candidate not found." };

  const validation = validateCandidateInput(state.data, {
    ...target,
    ...fields,
    positionId: fields.positionId || target.positionId,
  });
  if (!validation.ok) return validation;

  Object.assign(target, validation.value);
  await saveSync();
  return { ok: true };
}

export async function setCandidatePhoto(id, image) {
  const target = state.data?.candidates?.find((candidate) => candidate.id === id);
  if (!target) return { ok: false, error: "Candidate not found." };
  target.image = image || "";
  await saveSync();
  return { ok: true };
}

export async function removeCandidate(id) {
  const result = archiveOrDeleteCandidate(state.data, id);
  await saveSync();
  return { ok: true, ...result };
}

export async function restoreCandidate(id) {
  restoreCandidateRecord(state.data, id);
  await saveSync();
  return { ok: true };
}

export async function removeCandidates(ids) {
  const summary = { archived: 0, deleted: 0 };
  ids.forEach((id) => {
    const result = archiveOrDeleteCandidate(state.data, id);
    if (result.action === "archived") summary.archived++;
    if (result.action === "deleted") summary.deleted++;
  });
  await saveSync();
  return { ok: true, ...summary };
}

export async function submitReport(name, message) {
  if (!state.data || !message?.trim()) return;
  if (!state.data.reports) state.data.reports = [];
  state.data.reports.push({
    id: makeId("rpt"),
    name: name?.trim() || "Anonymous",
    message: message.trim(),
    electionType: state.electionType || "",
    deviceId: Device.getId(),
    resolved: false,
    reply: "",
    replyTimestamp: "",
    followUps: [],
    timestamp: new Date().toISOString(),
  });
  await saveSync();
}

export function followUpReport(id, message) {
  const r = state.data?.reports?.find((x) => x.id === id);
  if (r) {
    r.followUps = r.followUps || [];
    r.followUps.push({
      message: message.trim(),
      timestamp: new Date().toISOString(),
    });
    saveSync();
  }
}

export function resolveReport(id) {
  const r = state.data?.reports?.find((x) => x.id === id);
  if (r) {
    r.resolved = !r.resolved;
    if (state.data.reports) saveSync();
  }
}

export function replyToReport(id, reply) {
  const r = state.data?.reports?.find((x) => x.id === id);
  if (r) {
    r.reply = reply?.trim() || "";
    r.replyTimestamp = r.reply ? new Date().toISOString() : "";
    if (state.data.reports) saveSync();
  }
}

export function removeReport(id) {
  if (state.data?.reports) {
    state.data.reports = state.data.reports.filter((x) => x.id !== id);
    saveSync();
  }
}

export function editReport(id, fields) {
  const r = state.data?.reports?.find((x) => x.id === id);
  if (r) {
    Object.assign(r, fields);
    saveSync();
  }
}

export function deviceVotedForElection(type = state.electionType) {
  if (!state.data) return false;
  return state.data.votedDevices.includes(Device.getId() + ":" + type);
}

export function deviceVoted() {
  if (!state.data) return false;
  const prefix = Device.getId() + ":";
  const uniqueElectionTypes = new Set(
    state.data.votedDevices
      .filter((d) => d.startsWith(prefix))
      .map((d) => d.slice(prefix.length)),
  );
  return uniqueElectionTypes.size >= 3;
}

export function deviceVotedAny() {
  return deviceVoted();
}

export async function seedTestData() {
  if (!state.data) return;
  const settings = state.data.settings;
  const grades = settings.grades?.length ? settings.grades : ["7"];
  const clubs = settings.clubs?.length ? settings.clubs : ["General Club"];
  const positions = getPositions();

  state.data.candidates = [];
  state.data.voters = [];
  state.data.votes = [];
  state.data.votedDevices = [];
  state.data.reports = [];

  positions.forEach((position) => {
    const type = position.type || "sbo";
    const scopedValues =
      type === "club"
        ? clubs
        : type === "classroom"
          ? grades.flatMap((grade) =>
              (settings.sectionsByGrade?.[grade] || [""]).map((section) => ({
                grade,
                section,
              })),
            )
          : [null];
    scopedValues.forEach((scope, scopeIndex) => {
      const candidateCount = type === "sbo" ? 3 : 2;
      for (let index = 1; index <= candidateCount; index++) {
        const grade =
          scope?.grade || grades[(index + scopeIndex) % grades.length];
        state.data.candidates.push({
          id: makeId("cand"),
          positionId: position.id,
          name: `${position.name} Candidate ${scopeIndex ? scopeIndex + 1 : ""}${index}`
            .replace(/\s+/g, " ")
            .trim(),
          grade,
          section: scope?.section || "",
          party: index % 2 === 0 ? "Unity Party" : "Progress Party",
          club: type === "club" ? scope : "",
          image: "",
        });
      }
    });
  });

  const voterTemplates = [
    {
      name: "Test Voter One",
      grade: grades[0],
      section: settings.sectionsByGrade?.[grades[0]]?.[0] || "",
      electionType: "sbo",
    },
    {
      name: "Test Voter Two",
      grade: grades[1] || grades[0],
      section: settings.sectionsByGrade?.[grades[1] || grades[0]]?.[0] || "",
      electionType: "classroom",
    },
    {
      name: "Test Voter Three",
      grade: grades[2] || grades[0],
      section: settings.sectionsByGrade?.[grades[2] || grades[0]]?.[0] || "",
      electionType: "club",
      club: clubs[0],
    },
  ];

  voterTemplates.forEach((template, voterIndex) => {
    const voterId = makeId("v");
    state.data.voters.push({
      ...template,
      id: voterId,
      club: template.club || "",
      deviceId: `seed-device-${voterIndex + 1}`,
      timestamp: new Date(Date.now() - voterIndex * 86400000).toISOString(),
    });
    state.data.votedDevices.push(
      `seed-device-${voterIndex + 1}:${template.electionType}`,
    );

    positions
      .filter((position) => (position.type || "sbo") === template.electionType)
      .forEach((position) => {
        const candidates = state.data.candidates.filter((candidate) => {
          if (candidate.positionId !== position.id) return false;
          if (template.electionType === "classroom")
            return !candidate.section || candidate.section === template.section;
          if (template.electionType === "club")
            return !candidate.club || candidate.club === template.club;
          if (position.filterByGrade)
            return !candidate.grade || candidate.grade === template.grade;
          return true;
        });
        candidates.slice(0, position.maxVote || 1).forEach((candidate) => {
          state.data.votes.push({
            id: makeId("vt"),
            voterId,
            candidateId: candidate.id,
            positionId: position.id,
            timestamp: new Date(
              Date.now() - voterIndex * 86400000,
            ).toISOString(),
          });
        });
      });
  });

  state.data.reports.push({
    id: makeId("rpt"),
    name: "Test Voter One",
    message: "I need help checking if my vote was submitted.",
    electionType: "sbo",
    deviceId: "seed-device-1",
    resolved: false,
    reply: "",
    replyTimestamp: "",
    followUps: [],
    timestamp: new Date().toISOString(),
  });

  await saveSync();
}

export async function saveSync() {
  if (state.data) {
    try {
      await DB.save(state.year, state.data);
    } catch (e) {
      console.error("saveSync failed:", e);
    }
  }
}

function appendSubmittedBallot(voterId, timestamp) {
  const v = state.voter;
  const et = state.electionType;
  const d = state.data;

  d.voters.push({
    id: voterId,
    name: v.name.trim(),
    grade: v.grade,
    section: v.section,
    club: v.club || "",
    electionType: et,
    deviceId: Device.getId(),
    timestamp,
  });
  d.votedDevices.push(`${Device.getId()}:${et}`);

  getActivePositions(et).forEach((position) => {
    (state.selectedVotes[position.id] || []).forEach((candidateId) => {
      d.votes.push({
        id: makeId("vt"),
        voterId,
        candidateId,
        positionId: position.id,
        timestamp,
      });
    });
  });
}

export async function submitBallot() {
  if (!state.data) return { ok: false, error: "Election data is not loaded." };
  const validation = validateBallotSelections(state.data, state.electionType, state.voter, state.selectedVotes);
  if (!validation.ok) return validation;

  const voterId = makeId("v");
  const timestamp = new Date().toISOString();

  try {
    const cloudResult = await DB.castBallot(
      state.year,
      state.electionType,
      Device.getId(),
      {
        id: voterId,
        name: state.voter.name.trim(),
        grade: state.voter.grade,
        section: state.voter.section,
        club: state.voter.club || "",
      },
      state.selectedVotes,
    );

    appendSubmittedBallot(voterId, timestamp);
    if (!cloudResult) await saveSync();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "Unable to submit ballot." };
  }
}

export async function signInAdmin(email, password) {
  state.adminLoginError = "";
  state.adminSetupWarning = "";

  const cloud = await DB.signInAdmin(email, password);
  if (cloud.ok) {
    state.isAdmin = true;
    state.adminView = "dashboard";
    state.adminEmail = email || "";
    sessionStorage.setItem("sbo_admin", "1");
    sessionStorage.setItem("sbo_admin_auth", "supabase");
    return { ok: true };
  }

  if (!cloud.fallback && DB.normalizedReady) {
    state.adminLoginError = cloud.error || "Unable to sign in.";
    return { ok: false, error: state.adminLoginError };
  }

  if (password === getSettings().adminPassword) {
    state.isAdmin = true;
    state.adminView = "dashboard";
    state.adminSetupWarning = "Using local password fallback. Configure Supabase Auth and admin_profiles for production.";
    sessionStorage.setItem("sbo_admin", "1");
    sessionStorage.setItem("sbo_admin_auth", "fallback");
    return { ok: true };
  }

  state.adminLoginError = cloud.error || "Incorrect password.";
  return { ok: false, error: state.adminLoginError };
}

export async function signOutAdmin() {
  await DB.signOutAdmin();
  state.isAdmin = false;
  state.adminView = "dashboard";
  state.adminPass = "";
  state.adminEmail = "";
  sessionStorage.removeItem("sbo_admin");
  sessionStorage.removeItem("sbo_admin_auth");
  sessionStorage.removeItem("sbo_adminView");
}

async function loadYear(year) {
  let data = await DB.get(year);
  if (!data) {
    data = freshData();
    await DB.save(year, data);
  }
  data = normalizeData(data);
  state.year = year;
  state.data = data;
  state.years = await DB.list();
  const s = data.settings;
  state.voter = {
    name: "",
    grade: s.grades[0] || "7",
    section: (s.sectionsByGrade?.[s.grades[0]] || [""])[0] || "",
    club: (s.clubs || [])[0] || "",
  };
  state.electionType = "sbo";
  state.candTabType = "sbo";
  state.selectedVotes = {};
  state.loginError = "";
  state.logFilter = { grade: "", section: "" };
  await saveSync();
}

export async function initApp() {
  try {
    await DB.open();
    state.years = await DB.list();
    const target = state.years.includes(state.year)
      ? state.year
      : state.years[state.years.length - 1] || state.year;
    await loadYear(target);
    if (sessionStorage.getItem("sbo_admin")) {
      state.isAdmin = true;
      state.adminView = sessionStorage.getItem("sbo_adminView") || "dashboard";
    }
  } catch (e) {
    console.error("initApp failed:", e);
    if (!state.data) {
      state.data = freshData();
      state.year = String(new Date().getFullYear());
    }
  }
  state.loading = false;
}

export async function switchYear(year) {
  state.loading = true;
  await loadYear(year);
  state.adminView = "dashboard";
  state.loading = false;
}

export async function createNewYear(year) {
  if (!year || state.years.includes(year)) {
    alert("Year already exists or invalid.");
    return;
  }
  state.loading = true;
  await DB.save(year, freshData());
  await loadYear(year);
  state.loading = false;
}

export async function deleteAndSwitch(year) {
  await DB.remove(year);
  const yrs = await DB.list();
  if (yrs.length) await switchYear(yrs[yrs.length - 1]);
  else await switchYear(String(new Date().getFullYear()));
}
