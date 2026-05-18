/* ====================================
   YES Connected PSHE Portal
   Main Application Logic
   Firebase v10+ Modular
==================================== */

import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "[gstatic.com](https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js)";

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  collection
} from "[gstatic.com](https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js)";

/* ====================================
   DOM READY
==================================== */
document.addEventListener("DOMContentLoaded", () => {

  const loginView     = document.getElementById("loginView");
  const dashboardView = document.getElementById("dashboardView");
  const lessonView    = document.getElementById("lessonView");
  const teacherView   = document.getElementById("teacherView");

  const userBar       = document.getElementById("userBar");
  const welcomeName   = document.getElementById("welcomeName");
  const themesGrid    = document.getElementById("themesGrid");

  let isTeacherMode   = false;
  let currentLesson   = null;
  let currentLessonId = null;


  /* ==============================
     LOGIN
  ============================== */
  window.login = async function () {
    const email       = document.getElementById("email").value.trim();
    const password    = document.getElementById("password").value.trim();
    const teacherCode = document.getElementById("teacherCode").value.trim();

    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);

      // Determine teacher
      isTeacherMode = teacherCode === "TEACHER2026";
      sessionStorage.setItem("isTeacher", isTeacherMode ? "true" : "false");

    } catch (error) {
      alert("Login error: " + error.message);
      return;
    }
  };


  /* ==============================
     PASSWORD RESET
  ============================== */
  window.resetPassword = async function () {
    const email = document.getElementById("email").value.trim();

    if (!email) {
      alert("Enter your email, then click Forgot Password.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("A reset link has been sent to your email.");
    } catch (err) {
      alert("Error sending reset email: " + err.message);
    }
  };


  /* ==============================
     AUTH STATE LISTENER
  ============================== */
  onAuthStateChanged(auth, (user) => {
    if (user) {
      isTeacherMode = sessionStorage.getItem("isTeacher") === "true";

      loginView.style.display     = "none";
      dashboardView.style.display = "block";
      userBar.style.display       = "flex";
      welcomeName.textContent     = `Signed in as ${user.email}`;

      loadCurriculum();

      if (isTeacherMode) loadTeacherData();

    } else {
      loginView.style.display     = "flex";
      dashboardView.style.display = "none";
      teacherView.style.display   = "none";
      userBar.style.display       = "none";
    }
  });


  /* ==============================
     LOGOUT
  ============================== */
  window.logout = async function () {
    await signOut(auth);
    sessionStorage.clear();
  };


  /* ==============================
     LOAD CURRICULUM
  ============================== */
  async function loadCurriculum() {
    try {
      const response = await fetch("./lessons.json");
      const data = await response.json();

      themesGrid.innerHTML = "";

      Object.entries(data).forEach(([themeName, modules]) => {

        const themeCard = document.createElement("div");
        themeCard.className = "theme-card";

        let moduleList = "";

        Object.entries(modules).forEach(([moduleName, lessons]) => {
          moduleList += `
            <li>
              <strong>${moduleName}</strong>
              <ul>
                ${lessons.map(
                  (lesson, i) =>
                    `<li onclick="openLesson('${themeName}', '${moduleName}', ${i})">
                      ${lesson.title}
                    </li>`
                ).join("")}
              </ul>
            </li>
          `;
        });

        themeCard.innerHTML = `
          <h3>${themeName}</h3>
          <ul>${moduleList}</ul>
        `;

        themesGrid.appendChild(themeCard);
      });

      if (isTeacherMode) {
        const teacherBtn = document.createElement("button");
        teacherBtn.textContent = "Teacher Dashboard";
        teacherBtn.className = "btn full";
        teacherBtn.onclick = () => {
          dashboardView.style.display = "none";
          teacherView.style.display = "block";
          loadTeacherData();
        };
        themesGrid.appendChild(teacherBtn);
      }

    } catch (error) {
      console.error(error);
      themesGrid.innerHTML = "<p>Error loading curriculum.</p>";
    }
  }


  /* ==============================
     OPEN LESSON
  ============================== */
  window.openLesson = async function (theme, moduleName, index) {
    const response = await fetch("./lessons.json");
    const data = await response.json();

    currentLesson   = data[theme][moduleName][index];
    currentLessonId = `${theme}_${moduleName}_lesson${index}`;

    // Fill Lesson Player
    document.getElementById("lessonTitle").textContent = currentLesson.title;

    document.getElementById("lessonObjectives").innerHTML =
      currentLesson.objectives.map(o => `<li>${o}</li>`).join("");

    document.getElementById("lessonVideo").src = currentLesson.video;

    document.getElementById("lessonActivityPrompt").textContent =
      currentLesson.activityPrompt;

    document.getElementById("activityInput").value = "";

    document.getElementById("quizQuestion").textContent =
      currentLesson.quiz.question;

    document.getElementById("quizOptions").innerHTML =
      currentLesson.quiz.options.map(
        (opt, i) =>
          `<label><input type="radio" name="quiz" value="${i}">${opt}</label><br>`
      ).join("");

    // Show Lesson View
    dashboardView.style.display = "none";
    lessonView.style.display    = "block";
  };


  /* ==============================
     RETURN TO DASHBOARD
  ============================== */
  window.returnToDashboard = function () {
    lessonView.style.display    = "none";
    teacherView.style.display   = "none";
    dashboardView.style.display = "block";
  };


  /* ==============================
     SUBMIT QUIZ + SAVE RESULTS
  ============================== */
  window.submitQuiz = async function () {
    if (!currentLesson) return;

    const selected = document.querySelector('input[name="quiz"]:checked');
    const resultBox = document.getElementById("quizResult");

    if (!selected) {
      resultBox.textContent = "Please select an answer.";
      return;
    }

    const chosen = parseInt(selected.value);
    const correct = currentLesson.quiz.answer;

    const score = chosen === correct ? 1 : 0;
    const activityText = document.getElementById("activityInput").value.trim();
    const timestamp = new Date().toISOString();
    const userId = auth.currentUser.uid;

    try {
      await setDoc(
        doc(db, "results", userId),
        {
          [currentLessonId]: {
            score,
            activityText,
            timestamp,
            lessonTitle: currentLesson.title
          }
        },
        { merge: true }
      );

      resultBox.textContent = score === 1
        ? "Correct! Well done."
        : "Incorrect. Try again.";

    } catch (err) {
      console.error(err);
      resultBox.textContent = "Error saving your result.";
    }
  };


  /* ==============================
     TEACHER DASHBOARD
  ============================== */
  async function loadTeacherData() {
    const resultsCol = collection(db, "results");
    const snapshot = await getDocs(resultsCol);

    const container = document.getElementById("studentResults");
    container.innerHTML = "<h3>Student Results</h3>";

    snapshot.forEach(docSnap => {
      const studentId = docSnap.id;
      const data = docSnap.data();

      const card = document.createElement("div");
      card.className = "theme-card";

      let lessonsHTML = Object.entries(data)
        .map(([lessonId, entry]) => `
          <p><strong>${entry.lessonTitle}</strong><br>
          Score: ${entry.score}<br>
          Student response: ${entry.activityText}<br>
          Time: ${entry.timestamp}</p>
        `).join("");

      card.innerHTML = `
        <h4>Student: ${studentId}</h4>
        ${lessonsHTML}
      `;

      container.appendChild(card);
    });

    loadLessonEditor();
  }


  /* ==============================
     TEACHER LESSON EDITOR
  ============================== */
  async function loadLessonEditor() {
    const lessonSelect = document.getElementById("editorLessonSelect");

    const response = await fetch("./lessons.json");
    const data = await response.json();

    lessonSelect.innerHTML = "";

    Object.entries(data).forEach(([themeName, modules]) => {
      Object.entries(modules).forEach(([moduleName, lessons]) => {
        lessons.forEach((lesson, i) => {
          const opt = document.createElement("option");
          opt.value = `${themeName}|||${moduleName}|||${i}`;
          opt.textContent = `${themeName} → ${moduleName} → Lesson ${i + 1}`;
          lessonSelect.appendChild(opt);
        });
      });
    });

    lessonSelect.onchange = populateEditorFields;
    populateEditorFields();
  }


  async function populateEditorFields() {
    const selectValue = document.getElementById("editorLessonSelect").value;
    const [theme, moduleName, index] = selectValue.split("|||");

    const response = await fetch("./lessons.json");
    const data = await response.json();

    const lesson = data[theme][moduleName][index];

    document.getElementById("editTitle").value = lesson.title;
    document.getElementById("editObjectives").value = lesson.objectives.join("\n");
    document.getElementById("editVideo").value = lesson.video;
    document.getElementById("editActivity").value = lesson.activityPrompt;
    document.getElementById("editQuizQ").value = lesson.quiz.question;
    document.getElementById("editQuizOptions").value = lesson.quiz.options.join("\n");
    document.getElementById("editQuizAnswer").value = lesson.quiz.answer;
  }


  /* ==============================
     SAVE LESSON CHANGES
  ============================== */
  window.saveLessonEdits = async function () {
    document.getElementById("editorStatus").textContent = "Saving...";

    const selectValue = document.getElementById("editorLessonSelect").value;
    const [theme, moduleName, index] = selectValue.split("|||");

    // Load full JSON
    const response = await fetch("./lessons.json");
    let data = await response.json();

    // Apply edits
    data[theme][moduleName][index] = {
      title: document.getElementById("editTitle").value,
      objectives: document.getElementById("editObjectives").value.split("\n"),
      video: document.getElementById("editVideo").value,
      activityPrompt: document.getElementById("editActivity").value,
      quiz: {
        question: document.getElementById("editQuizQ").value,
        options: document.getElementById("editQuizOptions").value.split("\n"),
        answer: parseInt(document.getElementById("editQuizAnswer").value)
      }
    };

    // Save new JSON back to Firestore
    try {
      await setDoc(doc(db, "content", "lessons"), data);

      document.getElementById("editorStatus").textContent = "Saved!";
    } catch (err) {
      console.error(err);
      document.getElementById("editorStatus").textContent = "Error saving lesson.";
    }
  };

});
