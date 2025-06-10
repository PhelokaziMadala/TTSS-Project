// Tech Talent Scorecard System JS
console.log("Tech Talent Scorecard System ready.");

const supabase = window.supabase.createClient(
  "https://ibsblvulrszpjrhreokf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlic2JsdnVscnN6cGpyaHJlb2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MzE2NTksImV4cCI6MjA2MzMwNzY1OX0.V5sYChoQyKcCWK_T7r4fqVTVeL0zvun2rg67gCCx5EI"
);

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const addGroupBtn = document.querySelector(".add-group-btn");
  const addGroupForm = document.getElementById("addGroupForm");
  const cohortForm = document.getElementById("cohortForm");

  // --- LOGIN ---
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.querySelector('input[type="text"]').value;
      const password = document.querySelector('input[type="password"]').value;
      const role = document.querySelector("select").value;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert("Login failed: " + error.message);
      } else {
        localStorage.setItem("userRole", role);
        alert("Login successful!");
        if (role === "admin") {
          window.location.href = "admin-dashboardPage.html";
        } else if (role === "Candidate") {
          window.location.href = "student-dashboardpage.html";
        } else {
          window.location.href = "student-evaluationPage.html";
        }
        
      }
    });
  }

  // --- SIGNUP ---
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const inputs = signupForm.querySelectorAll("input");
      const name = inputs[0].value;
      const surname = inputs[1].value;
      const cohort = inputs[2].value;
      const email = inputs[3].value;
      const password = inputs[4].value;
      const confirmPassword = inputs[5].value;

      if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, surname, cohort },
        },
      });

      if (error) {
        alert("Signup failed: " + error.message);
      } else {
        alert("Account created! Check your email to confirm your signup.");
        window.location.href = "login.html";
      }
    });
  }

  // --- COHORT FORM ---
  if (cohortForm) {
    cohortForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = {
        cohortName: document.getElementById("cohortName").value,
        startDate: document.getElementById("startDate").value,
        endDate: document.getElementById("endDate").value,
        students: document.getElementById("students").value,
        status: document.getElementById("status").value,
      };
      console.log("New cohort data:", formData);
      closeCohortModal();
      cohortForm.reset();
    });
  }
  async function loadCohorts() {
    const { data, error } = await supabase.from("cohorts").select("*");

    if (error) {
      console.error("Error fetching cohorts:", error.message);
      return;
    }

    const tbody = document.querySelector(".cohorts-table tbody");
    tbody.innerHTML = "";

    data.forEach((cohort) => {
      const row = `
        <tr>
          <td>${cohort.cohortName}</td>
          <td>${new Date(cohort.startDate).toLocaleDateString()}</td>
          <td>${new Date(cohort.endDate).toLocaleDateString()}</td>
          <td>${cohort.students}</td>
          <td><span class="status-${cohort.status.toLowerCase()}">${
        cohort.status
      }</span></td>
          <td><a href="#" class="action-link">View</a></td>
        </tr>
      `;
      tbody.insertAdjacentHTML("beforeend", row);
    });
  }

  // Load cohorts on page load
  window.addEventListener("DOMContentLoaded", loadCohorts);
  document.addEventListener("DOMContentLoaded", () => {
    const cohortForm = document.getElementById("cohortForm");

    if (cohortForm) {
      cohortForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = {
          cohortName: document.getElementById("cohortName").value,
          startDate: document.getElementById("startDate").value,
          endDate: document.getElementById("endDate").value,
          students: parseInt(document.getElementById("students").value),
          status: document.getElementById("status").value,
        };

        console.log("Submitting cohort:", formData);

        const { data, error } = await supabase
          .from("cohorts")
          .insert([formData]);

        if (error) {
          console.error("Error inserting data:", error.message);
          alert("Failed to add cohort. See console for details.");
        } else {
          console.log("Inserted successfully:", data);
          closeCohortModal();
          cohortForm.reset();
          loadCohorts(); // Refresh the list
        }
      });
    }
    

    loadCohorts(); // Load initial cohorts on page load
  });
  
  
  // --- GROUP MODAL ---
  if (addGroupBtn) {
    addGroupBtn.addEventListener("click", () => {
      const modal = document.getElementById("addGroupModal");
      if (modal) modal.style.display = "block";
    });
  }

  if (addGroupForm) {
    addGroupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const groupName = document.getElementById("groupName").value;
      const cohort = document.getElementById("cohort").value;
      const members = document.getElementById("members").value;
      const mentor = document.getElementById("mentor").value;
      const status = document.getElementById("status").value;

      const tbody = document.querySelector(".groups-table tbody");
      const newRow = document.createElement("tr");
      newRow.innerHTML = `
        <td>${groupName}</td>
        <td>${cohort}</td>
        <td>${members}</td>
        <td>${mentor}</td>
        <td><span class="status-active">${status}</span></td>
        <td><a href="#" class="action-link">Manage</a></td>
      `;
      tbody.appendChild(newRow);

      const modal = document.getElementById("addGroupModal");
      if (modal) modal.style.display = "none";
      addGroupForm.reset();
    });
  }

  // --- SCORE INTERACTION ---
  const scoreSelects = document.querySelectorAll(".score-select");
  const scoreComments = document.querySelectorAll(".score-comment");

  function updateCellBackground(select) {
    const cell = select.closest(".score-cell");
    cell.classList.remove(
      "score-1-cell",
      "score-2-cell",
      "score-3-cell",
      "score-4-cell",
      "score-5-cell"
    );
    cell.classList.add(`score-${select.value}-cell`);
  }

  scoreSelects.forEach(updateCellBackground);

  scoreSelects.forEach((select) => {
    select.addEventListener("change", function () {
      updateCellBackground(this);
      const criteria = this.getAttribute("data-criteria");
      scoreComments.forEach((comment) => comment.classList.remove("active"));
      const activeComment = document.getElementById(`${criteria}-comments`);
      if (activeComment) activeComment.classList.add("active");

      const studentId = this.getAttribute("data-student");
      const studentScores = document.querySelectorAll(
        `.score-select[data-student="${studentId}"]`
      );

      let total = 0;
      studentScores.forEach((s) => (total += parseInt(s.value)));
      const average = Math.round((total / studentScores.length) * 20);
      const scoreCell = this.closest("tr").querySelector(".overall-score");
      scoreCell.textContent = `${average}%`;
    });
  });

  const headers = document.querySelectorAll(".evaluation-table th");
  headers.forEach((header, index) => {
    if (index > 0 && index < 7) {
      header.addEventListener("click", function () {
        const headerText = this.textContent.toLowerCase().replace(/\s+/g, "-");
        const criteria = headerText.includes("attendance")
          ? "attendance"
          : headerText.includes("communication")
          ? "communication"
          : headerText.includes("accountability")
          ? "accountability"
          : headerText.includes("creativity")
          ? "creativity"
          : headerText.includes("project")
          ? "project-delivery"
          : "tech-skills";

        scoreComments.forEach((comment) => comment.classList.remove("active"));
        const activeComment = document.getElementById(`${criteria}-comments`);
        if (activeComment) activeComment.classList.add("active");
      });
    }
  });
});

// --- Utility Functions ---
function openCohortModal() {
  const modal = document.getElementById("cohortModal");
  if (modal) modal.style.display = "block";
}

function closeCohortModal() {
  const modal = document.getElementById("cohortModal");
  if (modal) modal.style.display = "none";
}

function closeModal() {
  const modal = document.getElementById("addGroupModal");
  if (modal) modal.style.display = "none";
}

// Close modals when clicking outside
window.onclick = function (event) {
  const cohortModal = document.getElementById("cohortModal");
  const groupModal = document.getElementById("addGroupModal");

  if (event.target == cohortModal) {
    cohortModal.style.display = "none";
  }

  if (event.target == groupModal) {
    groupModal.style.display = "none";
  }
};
