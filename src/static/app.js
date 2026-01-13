document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and reset select
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML
        const participantsHtml = (details.participants && details.participants.length > 0) ?
          details.participants.map(email => {
            const initial = escapeHtml(String(email).trim().charAt(0).toUpperCase() || '?');
            return `
              <li>
                <span class="participant-badge" aria-hidden="true">${initial}</span>
                <span class="participant-name">${escapeHtml(email)}</span>
                <button class="participant-remove" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(email)}" aria-label="Remove participant" title="Remove participant">✖</button>
              </li>`;
          }).join('') : '<li class="no-participants">No participants yet</li>';

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <h5>Participants</h5>
            <ul class="participant-list">
              ${participantsHtml}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh list to show the new participant
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  }

  // Show a brief message in the message div
  function showMessage(text, type = 'success') {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove('hidden');
    setTimeout(() => messageDiv.classList.add('hidden'), 5000);
  }

  // Handle remove button clicks using event delegation
  activitiesList.addEventListener('click', async (event) => {
    const btn = event.target.closest('.participant-remove');
    if (!btn) return;

    const activity = btn.dataset.activity;
    const email = btn.dataset.email;

    if (!confirm(`Remove ${email} from ${activity}?`)) return;

    try {
      const res = await fetch(`/activities/${encodeURIComponent(activity)}/participants/${encodeURIComponent(email)}`, { method: 'DELETE' });
      const result = await res.json();

      if (res.ok) {
        showMessage(result.message, 'success');
        await fetchActivities();
      } else {
        showMessage(result.detail || 'Failed to remove participant', 'error');
      }
    } catch (err) {
      showMessage('Failed to remove participant', 'error');
      console.error('Error removing participant:', err);
    }
  });

  // Ensure signup waits for the activity list to refresh so the UI updates immediately
});
