import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { supabase } from '@/lib/supabase';

type TeacherClass = {
  id: string;
  class_code: string | null;
  name: string;
  class_terms: {
    term_id: string | null;
    academic_terms: {
      id: string;
      term_label: string;
    }[] | null;
  }[];
  enrollments: { count: number }[];
};

type RosterStudent = {
  id: string;
  rollNumber: string | null;
  fullName: string;
  referenceNumber: string | null;
  gender: string | null;
};

type TeacherSubject = {
  subject_name: string;
};

type AttendanceStatus = 'present' | 'absent';
type DashboardModule = 'dashboard' | 'attendance' | 'reports' | 'assignments' | 'tests';
type ReportPeriod = 'monthly' | 'quarterly';

type ReportStudent = {
  id: string;
  rollNumber: string | null;
  fullName: string;
  attended: number;
  total: number;
  percentage: number;
};

type AssignmentStudent = {
  id: string;
  rollNumber: string | null;
  fullName: string;
};

export default function HomeScreen() {
  const [email, setEmail] = useState('swatianand3112@gmail.com');
  const [password, setPassword] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<TeacherClass | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [attendanceMarks, setAttendanceMarks] = useState<Record<string, AttendanceStatus>>({});
  const [activeModule, setActiveModule] = useState<DashboardModule>('dashboard');
  const [reportClass, setReportClass] = useState<TeacherClass | null>(null);
  const [reportSubjects, setReportSubjects] = useState<string[]>([]);
  const [reportSubject, setReportSubject] = useState('');
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('monthly');
  const [reportRows, setReportRows] = useState<ReportStudent[]>([]);
  const [assignmentClass, setAssignmentClass] = useState<TeacherClass | null>(null);
  const [assignmentSubjects, setAssignmentSubjects] = useState<string[]>([]);
  const [assignmentSubject, setAssignmentSubject] = useState('');
  const [assignmentName, setAssignmentName] = useState('');
  const [assignmentTotalMarks, setAssignmentTotalMarks] = useState('');
  const [assignmentStudents, setAssignmentStudents] = useState<AssignmentStudent[]>([]);
  const [assignmentMarks, setAssignmentMarks] = useState<Record<string, string>>({});
  const [savedAssignment, setSavedAssignment] = useState<{
    id: string;
    name: string;
    totalMarks: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  const classCount = useMemo(() => classes.length, [classes.length]);
  const markedCount = useMemo(() => Object.keys(attendanceMarks).length, [attendanceMarks]);
  const allStudentsMarked = roster.length > 0 && markedCount === roster.length;
  const canSubmitAttendance = allStudentsMarked && selectedSubject.length > 0;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        loadTeacherData();
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadTeacherData();
      } else {
        setTeacherName('');
        setClasses([]);
        setSelectedClass(null);
        setRoster([]);
        setSubjects([]);
        setSelectedSubject('');
        setActiveModule('dashboard');
        resetReportState();
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadTeacherData() {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      Alert.alert('Profile error', profileError.message);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('classes')
      .select(
        `
        id,
        class_code,
        name,
        enrollments(count),
        class_terms(
          term_id,
          academic_terms(
            id,
            term_label
          )
        )
      `,
      )
      .order('class_code');

    if (error) {
      Alert.alert('Class loading error', error.message);
      setLoading(false);
      return;
    }

    setTeacherName(profile.full_name ?? user.email ?? 'Teacher');
    setClasses((data ?? []) as unknown as TeacherClass[]);
    setLoading(false);
  }

  async function loadRoster(classItem: TeacherClass) {
    setSelectedClass(classItem);
    setRoster([]);
    setSubjects([]);
    setSelectedSubject('');
    setAttendanceMarks({});
    setRosterLoading(true);

    const { data: subjectData, error: subjectError } = await supabase
      .from('teacher_subjects')
      .select('subject_name')
      .eq('class_id', classItem.id)
      .order('subject_name');

    if (subjectError) {
      Alert.alert('Subject loading error', subjectError.message);
      setRosterLoading(false);
      return;
    }

    const classSubjects = ((subjectData ?? []) as TeacherSubject[]).map((item) => item.subject_name);
    setSubjects(classSubjects);
    setSelectedSubject(classSubjects.length === 1 ? classSubjects[0] : '');

    const { data, error } = await supabase
      .from('enrollments')
      .select(
        `
        student_id,
        roll_number,
        students(
          full_name,
          student_reference_number,
          gender
        )
      `,
      )
      .eq('class_id', classItem.id)
      .order('roll_number');

    if (error) {
      Alert.alert('Student loading error', error.message);
      setRosterLoading(false);
      return;
    }

    const students = (data ?? [])
      .map((item) => {
        const student = Array.isArray(item.students) ? item.students[0] : item.students;

        return {
          id: item.student_id,
          rollNumber: item.roll_number,
          fullName: student?.full_name ?? 'Unnamed student',
          referenceNumber: student?.student_reference_number ?? null,
          gender: student?.gender ?? null,
        };
      })
      .sort(compareByRollNumber);

    setRoster(students);
    setRosterLoading(false);
  }

  function markStudent(studentId: string, status: AttendanceStatus) {
    setAttendanceMarks((current) => ({
      ...current,
      [studentId]: status,
    }));
  }

  function compareByRollNumber(first: RosterStudent, second: RosterStudent) {
    const firstNumber = Number.parseInt(first.rollNumber ?? '', 10);
    const secondNumber = Number.parseInt(second.rollNumber ?? '', 10);

    if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) {
      return firstNumber - secondNumber;
    }

    return (first.rollNumber ?? '').localeCompare(second.rollNumber ?? '');
  }

  function getTodayDate() {
    const today = new Date();
    const timezoneOffset = today.getTimezoneOffset() * 60000;
    return new Date(today.getTime() - timezoneOffset).toISOString().slice(0, 10);
  }

  async function submitAttendance() {
    if (!selectedClass) {
      return;
    }

    const missingCount = roster.length - markedCount;

    if (!selectedSubject) {
      Alert.alert('Subject required', 'Please select the subject before submitting attendance.');
      return;
    }

    if (missingCount > 0) {
      Alert.alert('Attendance incomplete', `Please mark ${missingCount} more student(s).`);
      return;
    }

    setSubmittingAttendance(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      Alert.alert('Submit failed', userError?.message ?? 'Please sign in again.');
      setSubmittingAttendance(false);
      return;
    }

    const selectedTerm = selectedClass.class_terms?.[0];
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .insert({
        attendance_date: getTodayDate(),
        class_id: selectedClass.id,
        created_by: user.id,
        subject_name: selectedSubject,
        term_id: selectedTerm?.term_id ?? selectedTerm?.academic_terms?.[0]?.id ?? null,
      })
      .select('id')
      .single();

    if (sessionError) {
      Alert.alert('Submit failed', sessionError.message);
      setSubmittingAttendance(false);
      return;
    }

    const records = roster.map((student) => ({
      marked_by: user.id,
      session_id: session.id,
      status: attendanceMarks[student.id],
      student_id: student.id,
    }));

    const { error: recordsError } = await supabase.from('attendance_records').insert(records);

    if (recordsError) {
      Alert.alert('Submit failed', recordsError.message);
      setSubmittingAttendance(false);
      return;
    }

    const { data: smsResult, error: smsError } = await supabase.functions.invoke(
      'send-absence-sms',
      {
        body: { sessionId: session.id },
      },
    );

    setSubmittingAttendance(false);

    if (smsError) {
      Alert.alert(
        'Attendance saved',
        `${roster.length} students saved successfully, but SMS could not be sent yet. ${smsError.message}`,
      );
      return;
    }

    Alert.alert(
      'Attendance submitted',
      `${roster.length} students saved successfully. SMS sent: ${smsResult?.sent ?? 0}. Skipped: ${
        smsResult?.skipped ?? 0
      }.`,
    );
  }

  async function signIn() {
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSigningIn(false);

    if (error) {
      Alert.alert('Login failed', error.message);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  function openModule(module: DashboardModule) {
    setSelectedClass(null);
    setRoster([]);
    setSubjects([]);
    setSelectedSubject('');
    setAttendanceMarks({});
    resetReportState();
    resetAssignmentState();
    setActiveModule(module);
  }

  function resetReportState() {
    setReportClass(null);
    setReportSubjects([]);
    setReportSubject('');
    setReportPeriod('monthly');
    setReportRows([]);
  }

  function resetAssignmentState() {
    setAssignmentClass(null);
    setAssignmentSubjects([]);
    setAssignmentSubject('');
    setAssignmentName('');
    setAssignmentTotalMarks('');
    setAssignmentStudents([]);
    setAssignmentMarks({});
    setSavedAssignment(null);
  }

  async function openAssignmentClass(classItem: TeacherClass) {
    setAssignmentClass(classItem);
    setAssignmentSubjects([]);
    setAssignmentSubject('');
    setAssignmentStudents([]);
    setAssignmentMarks({});
    setSavedAssignment(null);
    setAssignmentLoading(true);

    const { data: subjectData, error: subjectError } = await supabase
      .from('teacher_subjects')
      .select('subject_name')
      .eq('class_id', classItem.id)
      .order('subject_name');

    if (subjectError) {
      Alert.alert('Subject loading error', subjectError.message);
      setAssignmentLoading(false);
      return;
    }

    const classSubjects = ((subjectData ?? []) as TeacherSubject[]).map((item) => item.subject_name);
    setAssignmentSubjects(classSubjects);
    setAssignmentSubject(classSubjects.length === 1 ? classSubjects[0] : '');

    const { data: rosterData, error: rosterError } = await supabase
      .from('enrollments')
      .select('student_id, roll_number, students(full_name)')
      .eq('class_id', classItem.id)
      .order('roll_number');

    if (rosterError) {
      Alert.alert('Student loading error', rosterError.message);
      setAssignmentLoading(false);
      return;
    }

    const students = ((rosterData ?? []) as {
      student_id: string;
      roll_number: string | null;
      students: { full_name: string } | { full_name: string }[] | null;
    }[])
      .map((item) => {
        const student = Array.isArray(item.students) ? item.students[0] : item.students;

        return {
          fullName: student?.full_name ?? 'Unnamed student',
          id: item.student_id,
          rollNumber: item.roll_number,
        };
      })
      .sort((first, second) =>
        compareReportRows({
          ...first,
          attended: 0,
          percentage: 0,
          total: 0,
        }, {
          ...second,
          attended: 0,
          percentage: 0,
          total: 0,
        }),
      );

    setAssignmentStudents(students);
    setAssignmentLoading(false);
  }

  function updateAssignmentMark(studentId: string, value: string) {
    setAssignmentMarks((current) => ({
      ...current,
      [studentId]: value,
    }));
  }

  function validateAssignment() {
    const totalMarks = Number(assignmentTotalMarks);

    const itemLabel = activeModule === 'tests' ? 'test' : 'assignment';

    if (!assignmentClass || !assignmentSubject || !assignmentName.trim()) {
      Alert.alert(
        `${itemLabel[0].toUpperCase()}${itemLabel.slice(1)} incomplete`,
        `Please select class, subject, and ${itemLabel} name.`,
      );
      return null;
    }

    if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
      Alert.alert('Invalid total marks', 'Please enter valid total marks.');
      return null;
    }

    for (const student of assignmentStudents) {
      const mark = Number(assignmentMarks[student.id]);

      if (!Number.isFinite(mark) || mark < 0 || mark > totalMarks) {
        Alert.alert(
          'Invalid marks',
          `Please enter marks between 0 and ${totalMarks} for ${student.fullName}.`,
        );
        return null;
      }
    }

    return totalMarks;
  }

  async function saveAssignmentMarks() {
    const totalMarks = validateAssignment();

    if (!totalMarks || !assignmentClass) {
      return;
    }

    setAssignmentLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      Alert.alert('Save failed', userError?.message ?? 'Please sign in again.');
      setAssignmentLoading(false);
      return;
    }

    const isTestModule = activeModule === 'tests';
    const parentTable = isTestModule ? 'tests' : 'assignments';
    const marksTable = isTestModule ? 'test_marks' : 'assignment_marks';
    const parentNameColumn = isTestModule ? 'test_name' : 'assignment_name';
    const parentIdColumn = isTestModule ? 'test_id' : 'assignment_id';

    const { data: assignment, error: assignmentError } = await supabase
      .from(parentTable)
      .insert({
        [parentNameColumn]: assignmentName.trim(),
        class_id: assignmentClass.id,
        created_by: user.id,
        subject_name: assignmentSubject,
        total_marks: totalMarks,
      })
      .select('id')
      .single();

    if (assignmentError) {
      Alert.alert('Save failed', assignmentError.message);
      setAssignmentLoading(false);
      return;
    }

    const marks = assignmentStudents.map((student) => ({
      [parentIdColumn]: assignment.id,
      marked_by: user.id,
      marks_obtained: Number(assignmentMarks[student.id]),
      student_id: student.id,
    }));

    const { error: marksError } = await supabase.from(marksTable).insert(marks);

    if (marksError) {
      Alert.alert('Save failed', marksError.message);
      setAssignmentLoading(false);
      return;
    }

    setSavedAssignment({
      id: assignment.id,
      name: assignmentName.trim(),
      totalMarks,
    });
    setAssignmentLoading(false);
    Alert.alert(
      isTestModule ? 'Test saved' : 'Assignment saved',
      `${assignmentStudents.length} marks saved successfully.`,
    );
  }

  async function generateAssignmentPdf() {
    const totalMarks = savedAssignment?.totalMarks ?? validateAssignment();

    if (!totalMarks || !assignmentClass) {
      return;
    }

    const rowsHtml = assignmentStudents
      .map((student) => {
        const marks = Number(assignmentMarks[student.id]);
        const percentage = totalMarks > 0 ? Math.round((marks / totalMarks) * 100) : 0;

        return `
          <tr>
            <td>${student.rollNumber ?? ''}</td>
            <td>${escapeHtml(student.fullName)}</td>
            <td>${marks}</td>
            <td>${totalMarks}</td>
            <td>${percentage}%</td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #13231C; }
            h1 { margin-bottom: 4px; }
            .meta { color: #5F6F67; margin-bottom: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #DCE5DA; padding: 8px; text-align: left; }
            th { background: #E7F1EC; }
          </style>
        </head>
        <body>
          <h1>VDC ${activeModule === 'tests' ? 'Test' : 'Assignment'} Marks</h1>
          <div class="meta">
            Class: ${escapeHtml(assignmentClass.name)}<br />
            Subject: ${escapeHtml(assignmentSubject)}<br />
            ${activeModule === 'tests' ? 'Test' : 'Assignment'}: ${escapeHtml(assignmentName.trim())}<br />
            Total Marks: ${totalMarks}
          </div>
          <table>
            <thead>
              <tr>
                <th>Roll No.</th>
                <th>Student Name</th>
                <th>Marks</th>
                <th>Total</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    } else {
      Alert.alert('PDF generated', uri);
    }
  }

  async function openReportClass(classItem: TeacherClass) {
    setReportClass(classItem);
    setReportSubjects([]);
    setReportSubject('');
    setReportRows([]);
    setReportLoading(true);

    const { data, error } = await supabase
      .from('teacher_subjects')
      .select('subject_name')
      .eq('class_id', classItem.id)
      .order('subject_name');

    if (error) {
      Alert.alert('Subject loading error', error.message);
      setReportLoading(false);
      return;
    }

    const classSubjects = ((data ?? []) as TeacherSubject[]).map((item) => item.subject_name);
    setReportSubjects(classSubjects);
    setReportSubject(classSubjects.length === 1 ? classSubjects[0] : '');
    setReportLoading(false);
  }

  function toDateString(date: Date) {
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
  }

  function getReportDateRange(period: ReportPeriod) {
    const now = new Date();
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const start =
      period === 'monthly'
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : new Date(now.getFullYear(), quarterStartMonth, 1);
    const end =
      period === 'monthly'
        ? new Date(now.getFullYear(), now.getMonth() + 1, 0)
        : new Date(now.getFullYear(), quarterStartMonth + 3, 0);

    return {
      end: toDateString(end),
      label:
        period === 'monthly'
          ? now.toLocaleString('default', { month: 'long', year: 'numeric' })
          : `Quarter ${Math.floor(now.getMonth() / 3) + 1}, ${now.getFullYear()}`,
      start: toDateString(start),
    };
  }

  function compareReportRows(first: ReportStudent, second: ReportStudent) {
    const firstNumber = Number.parseInt(first.rollNumber ?? '', 10);
    const secondNumber = Number.parseInt(second.rollNumber ?? '', 10);

    if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) {
      return firstNumber - secondNumber;
    }

    return (first.rollNumber ?? '').localeCompare(second.rollNumber ?? '');
  }

  async function generateReport() {
    if (!reportClass || !reportSubject) {
      Alert.alert('Report incomplete', 'Please select a class and subject first.');
      return;
    }

    setReportLoading(true);
    const range = getReportDateRange(reportPeriod);

    const { data: rosterData, error: rosterError } = await supabase
      .from('enrollments')
      .select('student_id, roll_number, students(full_name)')
      .eq('class_id', reportClass.id)
      .order('roll_number');

    if (rosterError) {
      Alert.alert('Report error', rosterError.message);
      setReportLoading(false);
      return;
    }

    const { data: sessions, error: sessionsError } = await supabase
      .from('attendance_sessions')
      .select('id')
      .eq('class_id', reportClass.id)
      .eq('subject_name', reportSubject)
      .gte('attendance_date', range.start)
      .lte('attendance_date', range.end);

    if (sessionsError) {
      Alert.alert('Report error', sessionsError.message);
      setReportLoading(false);
      return;
    }

    const sessionIds = (sessions ?? []).map((session) => session.id);
    const totalClasses = sessionIds.length;
    const attendedByStudent = new Map<string, number>();

    if (sessionIds.length > 0) {
      const { data: records, error: recordsError } = await supabase
        .from('attendance_records')
        .select('student_id, status')
        .in('session_id', sessionIds);

      if (recordsError) {
        Alert.alert('Report error', recordsError.message);
        setReportLoading(false);
        return;
      }

      for (const record of records ?? []) {
        if (record.status === 'present') {
          attendedByStudent.set(
            record.student_id,
            (attendedByStudent.get(record.student_id) ?? 0) + 1,
          );
        }
      }
    }

    const rows = ((rosterData ?? []) as {
      student_id: string;
      roll_number: string | null;
      students: { full_name: string } | { full_name: string }[] | null;
    }[])
      .map((item) => {
        const student = Array.isArray(item.students) ? item.students[0] : item.students;
        const attended = attendedByStudent.get(item.student_id) ?? 0;

        return {
          attended,
          fullName: student?.full_name ?? 'Unnamed student',
          id: item.student_id,
          percentage: totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : 0,
          rollNumber: item.roll_number,
          total: totalClasses,
        };
      })
      .sort(compareReportRows);

    setReportRows(rows);
    setReportLoading(false);
  }

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function generateReportPdf() {
    if (!reportClass || !reportSubject || reportRows.length === 0) {
      Alert.alert('PDF not ready', 'Generate the report first.');
      return;
    }

    const range = getReportDateRange(reportPeriod);
    const rowsHtml = reportRows
      .map(
        (student) => `
          <tr>
            <td>${student.rollNumber ?? ''}</td>
            <td>${escapeHtml(student.fullName)}</td>
            <td>${student.attended}</td>
            <td>${student.total}</td>
            <td>${student.percentage}%</td>
          </tr>
        `,
      )
      .join('');

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #13231C; }
            h1 { margin-bottom: 4px; }
            .meta { color: #5F6F67; margin-bottom: 20px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #DCE5DA; padding: 8px; text-align: left; }
            th { background: #E7F1EC; }
          </style>
        </head>
        <body>
          <h1>VDC Attendance Report</h1>
          <div class="meta">
            Class: ${escapeHtml(reportClass.name)}<br />
            Subject: ${escapeHtml(reportSubject)}<br />
            Period: ${escapeHtml(range.label)}
          </div>
          <table>
            <thead>
              <tr>
                <th>Roll No.</th>
                <th>Student Name</th>
                <th>Attended</th>
                <th>Total</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    } else {
      Alert.alert('PDF generated', uri);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Image source={require('@/assets/images/vdc-logo.png')} style={styles.loadingLogo} />
        <ActivityIndicator size="large" color="#1F6F5B" />
        <Text style={styles.muted}>Loading teacher access...</Text>
      </View>
    );
  }

  if (!teacherName) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.screen}>
        <View style={styles.loginPanel}>
          <Image source={require('@/assets/images/vdc-logo.png')} style={styles.logo} />
          <Text style={styles.kicker}>Vivekananda Degree College</Text>
          <Text style={styles.title}>VDC Teacher App</Text>
          <Text style={styles.subtitle}>Use the account created by the administrator.</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="teacher@example.com"
            style={styles.input}
            value={email}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            style={styles.input}
            value={password}
          />

          <Pressable disabled={signingIn} onPress={signIn} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{signingIn ? 'Signing in...' : 'Sign in'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (selectedClass) {
    const selectedTerm = selectedClass.class_terms?.[0]?.academic_terms?.[0];

    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Student roster</Text>
            <Text style={styles.title}>{selectedClass.name}</Text>
            <Text style={styles.subtitle}>
              {selectedClass.class_code} - {selectedTerm?.term_label ?? 'Current term'}
            </Text>
          </View>
          <Pressable onPress={() => setSelectedClass(null)} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
        </View>

        <FlatList
          contentContainerStyle={styles.list}
          data={roster}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              <View style={styles.subjectPanel}>
                <Text style={styles.label}>Subject</Text>
                {subjects.length === 0 && !rosterLoading ? (
                  <Text style={styles.classMeta}>No subject assigned for this class.</Text>
                ) : (
                  <View style={styles.subjectButtons}>
                    {subjects.map((subject) => (
                      <Pressable
                        key={subject}
                        onPress={() => setSelectedSubject(subject)}
                        style={[
                          styles.subjectButton,
                          selectedSubject === subject && styles.subjectButtonActive,
                        ]}>
                        <Text
                          style={[
                            styles.subjectButtonText,
                            selectedSubject === subject && styles.activeAttendanceButtonText,
                          ]}>
                          {subject}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
              {rosterLoading ? (
                <View style={styles.loadingCard}>
                  <ActivityIndicator color="#1F6F5B" />
                  <Text style={styles.classMeta}>Loading students...</Text>
                </View>
              ) : null}
            </>
          }
          renderItem={({ item }) => (
            <View style={styles.studentCard}>
              <View style={styles.rollBadge}>
                <Text style={styles.rollBadgeText}>{item.rollNumber ?? '-'}</Text>
              </View>
              <View style={styles.studentText}>
                <Text style={styles.studentName}>{item.fullName}</Text>
                <Text style={styles.studentMeta}>
                  {item.referenceNumber ?? 'No reference number'}
                  {item.gender ? ` - ${item.gender}` : ''}
                </Text>
              </View>
              <View style={styles.attendanceButtons}>
                <Pressable
                  onPress={() => markStudent(item.id, 'present')}
                  style={[
                    styles.attendanceButton,
                    attendanceMarks[item.id] === 'present' && styles.presentButtonActive,
                  ]}>
                  <Text
                    style={[
                      styles.attendanceButtonText,
                      attendanceMarks[item.id] === 'present' && styles.activeAttendanceButtonText,
                    ]}>
                    P
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => markStudent(item.id, 'absent')}
                  style={[
                    styles.attendanceButton,
                    attendanceMarks[item.id] === 'absent' && styles.absentButtonActive,
                  ]}>
                  <Text
                    style={[
                      styles.attendanceButtonText,
                      attendanceMarks[item.id] === 'absent' && styles.activeAttendanceButtonText,
                    ]}>
                    A
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            !rosterLoading ? (
              <View style={styles.emptyCard}>
                <Text style={styles.className}>No students found</Text>
                <Text style={styles.classMeta}>This class may not have imported enrollments yet.</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            roster.length > 0 && !rosterLoading ? (
              <View style={styles.submitPanel}>
                <Text style={styles.classMeta}>
                  {markedCount} of {roster.length} students marked
                </Text>
                <Pressable
                  disabled={!canSubmitAttendance || submittingAttendance}
                  onPress={submitAttendance}
                  style={[
                    styles.primaryButton,
                    !canSubmitAttendance && styles.disabledPrimaryButton,
                  ]}>
                  <Text style={styles.primaryButtonText}>
                    {submittingAttendance
                      ? 'Submitting...'
                      : canSubmitAttendance
                        ? 'Submit attendance'
                        : selectedSubject
                          ? 'Mark all students to submit'
                          : 'Select subject to submit'}
                  </Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>
            {activeModule === 'dashboard' ? 'Dashboard' : activeModule}
          </Text>
          <Text style={styles.title}>
            {activeModule === 'dashboard' ? `Welcome, ${teacherName}` : moduleTitle(activeModule)}
          </Text>
          <Text style={styles.subtitle}>
            {activeModule === 'attendance'
              ? `${classCount} assigned classes`
              : 'VDC Teacher App'}
          </Text>
        </View>
        <Pressable
          onPress={activeModule === 'dashboard' ? signOut : () => openModule('dashboard')}
          style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>
            {activeModule === 'dashboard' ? 'Sign out' : 'Back'}
          </Text>
        </Pressable>
      </View>

      {activeModule === 'dashboard' ? (
        <View style={styles.dashboard}>
          <Image source={require('@/assets/images/vdc-logo.png')} style={styles.dashboardLogo} />
          <Text style={styles.dashboardTitle}>Choose your work</Text>
          <Text style={styles.dashboardSubtitle}>Attendance is live. Reports, assignments, and tests come next.</Text>

          <View style={styles.moduleGrid}>
            <Pressable onPress={() => openModule('attendance')} style={styles.moduleCard}>
              <Text style={styles.moduleIcon}>✓</Text>
              <Text style={styles.moduleTitle}>Attendance</Text>
              <Text style={styles.moduleMeta}>Mark P/A and send absent SMS</Text>
            </Pressable>
            <Pressable onPress={() => openModule('reports')} style={styles.moduleCard}>
              <Text style={styles.moduleIcon}>%</Text>
              <Text style={styles.moduleTitle}>Report</Text>
              <Text style={styles.moduleMeta}>Monthly and quarterly reports</Text>
            </Pressable>
            <Pressable onPress={() => openModule('assignments')} style={styles.moduleCard}>
              <Text style={styles.moduleIcon}>A+</Text>
              <Text style={styles.moduleTitle}>Assignment</Text>
              <Text style={styles.moduleMeta}>Create assignment and enter marks</Text>
            </Pressable>
            <Pressable onPress={() => openModule('tests')} style={styles.moduleCard}>
              <Text style={styles.moduleIcon}>T</Text>
              <Text style={styles.moduleTitle}>Test</Text>
              <Text style={styles.moduleMeta}>Create test and enter marks</Text>
            </Pressable>
          </View>
        </View>
      ) : activeModule === 'attendance' ? (
      <FlatList
        contentContainerStyle={styles.list}
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const activeTerm = item.class_terms?.[0]?.academic_terms?.[0];
          const studentCount = item.enrollments?.[0]?.count ?? 0;

          return (
            <Pressable onPress={() => loadRoster(item)} style={styles.classCard}>
              <Text style={styles.classCode}>{item.class_code}</Text>
              <Text style={styles.className}>{item.name}</Text>
              <Text style={styles.classMeta}>
                {activeTerm?.term_label ?? 'Current term'} - {studentCount} students
              </Text>
              <Text style={styles.openHint}>Tap to view students</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.className}>No classes assigned</Text>
            <Text style={styles.classMeta}>Ask the administrator to check teacher mapping.</Text>
          </View>
        }
      />
      ) : activeModule === 'reports' ? (
        <FlatList
          contentContainerStyle={styles.list}
          data={reportRows}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              {!reportClass ? (
                <>
                  <Text style={styles.sectionTitle}>Select class</Text>
                  {classes.map((item) => {
                    const activeTerm = item.class_terms?.[0]?.academic_terms?.[0];
                    const studentCount = item.enrollments?.[0]?.count ?? 0;

                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => openReportClass(item)}
                        style={styles.classCard}>
                        <Text style={styles.classCode}>{item.class_code}</Text>
                        <Text style={styles.className}>{item.name}</Text>
                        <Text style={styles.classMeta}>
                          {activeTerm?.term_label ?? 'Current term'} - {studentCount} students
                        </Text>
                      </Pressable>
                    );
                  })}
                </>
              ) : (
                <>
                  <View style={styles.subjectPanel}>
                    <Text style={styles.classCode}>{reportClass.class_code}</Text>
                    <Text style={styles.className}>{reportClass.name}</Text>
                    <Pressable
                      onPress={() => {
                        setReportClass(null);
                        setReportSubjects([]);
                        setReportSubject('');
                        setReportRows([]);
                      }}
                      style={styles.inlineButton}>
                      <Text style={styles.inlineButtonText}>Change class</Text>
                    </Pressable>
                  </View>

                  <View style={styles.subjectPanel}>
                    <Text style={styles.label}>Subject</Text>
                    <View style={styles.subjectButtons}>
                      {reportSubjects.map((subject) => (
                        <Pressable
                          key={subject}
                          onPress={() => {
                            setReportSubject(subject);
                            setReportRows([]);
                          }}
                          style={[
                            styles.subjectButton,
                            reportSubject === subject && styles.subjectButtonActive,
                          ]}>
                          <Text
                            style={[
                              styles.subjectButtonText,
                              reportSubject === subject && styles.activeAttendanceButtonText,
                            ]}>
                            {subject}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={styles.subjectPanel}>
                    <Text style={styles.label}>Period</Text>
                    <View style={styles.subjectButtons}>
                      <Pressable
                        onPress={() => {
                          setReportPeriod('monthly');
                          setReportRows([]);
                        }}
                        style={[
                          styles.subjectButton,
                          reportPeriod === 'monthly' && styles.subjectButtonActive,
                        ]}>
                        <Text
                          style={[
                            styles.subjectButtonText,
                            reportPeriod === 'monthly' && styles.activeAttendanceButtonText,
                          ]}>
                          Monthly
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setReportPeriod('quarterly');
                          setReportRows([]);
                        }}
                        style={[
                          styles.subjectButton,
                          reportPeriod === 'quarterly' && styles.subjectButtonActive,
                        ]}>
                        <Text
                          style={[
                            styles.subjectButtonText,
                            reportPeriod === 'quarterly' && styles.activeAttendanceButtonText,
                          ]}>
                          Quarterly
                        </Text>
                      </Pressable>
                    </View>
                    <Pressable
                      disabled={reportLoading}
                      onPress={generateReport}
                      style={styles.primaryButton}>
                      <Text style={styles.primaryButtonText}>
                        {reportLoading ? 'Generating...' : 'Generate report'}
                      </Text>
                    </Pressable>
                  </View>

                  {reportLoading ? (
                    <View style={styles.loadingCard}>
                      <ActivityIndicator color="#1F6F5B" />
                      <Text style={styles.classMeta}>Preparing report...</Text>
                    </View>
                  ) : null}

                  {reportRows.length > 0 ? (
                    <View style={styles.submitPanel}>
                      <Text style={styles.className}>{getReportDateRange(reportPeriod).label}</Text>
                      <Text style={styles.classMeta}>
                        {reportRows.length} students - {reportSubject}
                      </Text>
                      <Pressable onPress={generateReportPdf} style={styles.primaryButton}>
                        <Text style={styles.primaryButtonText}>Generate PDF</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </>
              )}
            </>
          }
          renderItem={({ item }) => (
            <View style={styles.reportRow}>
              <View style={styles.rollBadge}>
                <Text style={styles.rollBadgeText}>{item.rollNumber ?? '-'}</Text>
              </View>
              <View style={styles.studentText}>
                <Text style={styles.studentName}>{item.fullName}</Text>
                <Text style={styles.studentMeta}>
                  {item.attended}/{item.total} classes attended
                </Text>
              </View>
              <Text style={styles.percentageText}>{item.percentage}%</Text>
            </View>
          )}
          ListEmptyComponent={
            reportClass && !reportLoading ? (
              <View style={styles.emptyCard}>
                <Text style={styles.className}>No report generated yet</Text>
                <Text style={styles.classMeta}>Choose subject and period, then tap Generate report.</Text>
              </View>
            ) : null
          }
        />
      ) : activeModule === 'assignments' || activeModule === 'tests' ? (
        <FlatList
          contentContainerStyle={styles.list}
          data={assignmentStudents}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              {!assignmentClass ? (
                <>
                  <Text style={styles.sectionTitle}>Select class</Text>
                  {classes.map((item) => {
                    const activeTerm = item.class_terms?.[0]?.academic_terms?.[0];
                    const studentCount = item.enrollments?.[0]?.count ?? 0;

                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => openAssignmentClass(item)}
                        style={styles.classCard}>
                        <Text style={styles.classCode}>{item.class_code}</Text>
                        <Text style={styles.className}>{item.name}</Text>
                        <Text style={styles.classMeta}>
                          {activeTerm?.term_label ?? 'Current term'} - {studentCount} students
                        </Text>
                      </Pressable>
                    );
                  })}
                </>
              ) : (
                <>
                  <View style={styles.subjectPanel}>
                    <Text style={styles.classCode}>{assignmentClass.class_code}</Text>
                    <Text style={styles.className}>{assignmentClass.name}</Text>
                    <Pressable
                      onPress={() => resetAssignmentState()}
                      style={styles.inlineButton}>
                      <Text style={styles.inlineButtonText}>Change class</Text>
                    </Pressable>
                  </View>

                  <View style={styles.subjectPanel}>
                    <Text style={styles.label}>Subject</Text>
                    <View style={styles.subjectButtons}>
                      {assignmentSubjects.map((subject) => (
                        <Pressable
                          key={subject}
                          onPress={() => {
                            setAssignmentSubject(subject);
                            setSavedAssignment(null);
                          }}
                          style={[
                            styles.subjectButton,
                            assignmentSubject === subject && styles.subjectButtonActive,
                          ]}>
                          <Text
                            style={[
                              styles.subjectButtonText,
                              assignmentSubject === subject && styles.activeAttendanceButtonText,
                            ]}>
                            {subject}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Text style={styles.label}>
                      {activeModule === 'tests' ? 'Test name' : 'Assignment name'}
                    </Text>
                    <TextInput
                      onChangeText={(value) => {
                        setAssignmentName(value);
                        setSavedAssignment(null);
                      }}
                      placeholder={activeModule === 'tests' ? 'Example: Internal Test 1' : 'Example: Assignment 1'}
                      style={styles.input}
                      value={assignmentName}
                    />

                    <Text style={styles.label}>Total marks</Text>
                    <TextInput
                      keyboardType="numeric"
                      onChangeText={(value) => {
                        setAssignmentTotalMarks(value);
                        setSavedAssignment(null);
                      }}
                      placeholder="Example: 20"
                      style={styles.input}
                      value={assignmentTotalMarks}
                    />
                  </View>

                  {assignmentLoading ? (
                    <View style={styles.loadingCard}>
                      <ActivityIndicator color="#1F6F5B" />
                      <Text style={styles.classMeta}>
                        Preparing {activeModule === 'tests' ? 'test' : 'assignment'}...
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </>
          }
          renderItem={({ item }) => (
            <View style={styles.markRow}>
              <View style={styles.rollBadge}>
                <Text style={styles.rollBadgeText}>{item.rollNumber ?? '-'}</Text>
              </View>
              <View style={styles.studentText}>
                <Text style={styles.studentName}>{item.fullName}</Text>
              </View>
              <TextInput
                keyboardType="numeric"
                onChangeText={(value) => {
                  updateAssignmentMark(item.id, value);
                  setSavedAssignment(null);
                }}
                placeholder="Marks"
                style={styles.marksInput}
                value={assignmentMarks[item.id] ?? ''}
              />
            </View>
          )}
          ListEmptyComponent={
            assignmentClass && !assignmentLoading ? (
              <View style={styles.emptyCard}>
                <Text style={styles.className}>No students found</Text>
                <Text style={styles.classMeta}>This class may not have imported enrollments yet.</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            assignmentClass && assignmentStudents.length > 0 && !assignmentLoading ? (
              <View style={styles.submitPanel}>
                <Text style={styles.classMeta}>
                  {Object.keys(assignmentMarks).length} of {assignmentStudents.length} marks entered
                </Text>
                <Pressable
                  disabled={assignmentLoading}
                  onPress={saveAssignmentMarks}
                  style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>
                    {assignmentLoading
                      ? 'Saving...'
                      : activeModule === 'tests'
                        ? 'Save test marks'
                        : 'Save assignment marks'}
                  </Text>
                </Pressable>
                <Pressable onPress={generateAssignmentPdf} style={styles.secondaryFullButton}>
                  <Text style={styles.secondaryButtonText}>
                    {savedAssignment ? 'Generate saved PDF' : 'Preview PDF'}
                  </Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.className}>{moduleTitle(activeModule)} module</Text>
          <Text style={styles.classMeta}>
            This section is the next build step. We will connect it to Supabase and PDF generation
            module by module.
          </Text>
        </View>
      )}
    </View>
  );
}

function moduleTitle(module: DashboardModule) {
  switch (module) {
    case 'attendance':
      return 'Attendance';
    case 'reports':
      return 'Reports';
    case 'assignments':
      return 'Assignments';
    case 'tests':
      return 'Tests';
    default:
      return 'Dashboard';
  }
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    backgroundColor: '#F5F7F4',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  screen: {
    backgroundColor: '#F5F7F4',
    flex: 1,
    padding: 20,
    paddingTop: 64,
  },
  loginPanel: {
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE5DA',
    borderRadius: 8,
    borderWidth: 1,
    padding: 20,
  },
  logo: {
    alignSelf: 'center',
    height: 150,
    marginBottom: 16,
    resizeMode: 'contain',
    width: 150,
  },
  loadingLogo: {
    height: 120,
    marginBottom: 8,
    resizeMode: 'contain',
    width: 120,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerText: {
    flex: 1,
  },
  kicker: {
    color: '#1F6F5B',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#13231C',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  subtitle: {
    color: '#5F6F67',
    fontSize: 15,
    marginTop: 6,
  },
  label: {
    color: '#34443B',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 18,
  },
  input: {
    backgroundColor: '#F8FAF7',
    borderColor: '#C8D5CC',
    borderRadius: 8,
    borderWidth: 1,
    color: '#13231C',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1F6F5B',
    borderRadius: 8,
    marginTop: 22,
    paddingVertical: 14,
  },
  disabledPrimaryButton: {
    backgroundColor: '#8EA59A',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    borderColor: '#B8C9BE',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#1F6F5B',
    fontWeight: '800',
  },
  secondaryFullButton: {
    alignItems: 'center',
    borderColor: '#B8C9BE',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    paddingVertical: 14,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  dashboard: {
    flex: 1,
  },
  dashboardLogo: {
    alignSelf: 'center',
    height: 150,
    marginBottom: 12,
    resizeMode: 'contain',
    width: 150,
  },
  dashboardTitle: {
    color: '#13231C',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  dashboardSubtitle: {
    color: '#5F6F67',
    fontSize: 14,
    marginBottom: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moduleCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE5DA',
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 150,
    padding: 16,
  },
  moduleIcon: {
    color: '#1F6F5B',
    fontSize: 24,
    fontWeight: '900',
  },
  moduleTitle: {
    color: '#13231C',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 12,
  },
  moduleMeta: {
    color: '#5F6F67',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  sectionTitle: {
    color: '#13231C',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  classCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE5DA',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE5DA',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE5DA',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  subjectPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE5DA',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  subjectButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  subjectButton: {
    borderColor: '#B8C9BE',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  subjectButtonActive: {
    backgroundColor: '#1F6F5B',
    borderColor: '#1F6F5B',
  },
  subjectButtonText: {
    color: '#34443B',
    fontWeight: '800',
  },
  inlineButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  inlineButtonText: {
    color: '#1F6F5B',
    fontWeight: '800',
  },
  classCode: {
    color: '#1F6F5B',
    fontSize: 13,
    fontWeight: '800',
  },
  className: {
    color: '#13231C',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  classMeta: {
    color: '#5F6F67',
    fontSize: 14,
    marginTop: 6,
  },
  openHint: {
    color: '#1F6F5B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
  },
  studentCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE5DA',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  reportRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE5DA',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  markRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE5DA',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  rollBadge: {
    alignItems: 'center',
    backgroundColor: '#E7F1EC',
    borderRadius: 20,
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rollBadgeText: {
    color: '#1F6F5B',
    fontWeight: '800',
  },
  studentText: {
    flex: 1,
  },
  studentName: {
    color: '#13231C',
    fontSize: 16,
    fontWeight: '800',
  },
  studentMeta: {
    color: '#5F6F67',
    fontSize: 13,
    marginTop: 4,
  },
  percentageText: {
    color: '#1F6F5B',
    fontSize: 18,
    fontWeight: '900',
  },
  marksInput: {
    backgroundColor: '#F8FAF7',
    borderColor: '#C8D5CC',
    borderRadius: 8,
    borderWidth: 1,
    color: '#13231C',
    fontSize: 15,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: 'center',
    width: 78,
  },
  attendanceButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  attendanceButton: {
    alignItems: 'center',
    borderColor: '#B8C9BE',
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  attendanceButtonText: {
    color: '#34443B',
    fontWeight: '900',
  },
  presentButtonActive: {
    backgroundColor: '#1F6F5B',
    borderColor: '#1F6F5B',
  },
  absentButtonActive: {
    backgroundColor: '#C2410C',
    borderColor: '#C2410C',
  },
  activeAttendanceButtonText: {
    color: '#FFFFFF',
  },
  submitPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE5DA',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  muted: {
    color: '#5F6F67',
  },
});
