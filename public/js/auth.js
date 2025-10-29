async function checkAuthStatus() {
  try {
    const response = await fetch("/api/auth/me")
    const data = await response.json()

    if (response.ok) {
      updateNavForLoggedInUser(data.user)
      return data.user
    } else {
      updateNavForLoggedOutUser()
      return null
    }
  } catch (error) {
    console.error("Error checking auth status:", error)
    updateNavForLoggedOutUser()
    return null
  }
}

function updateNavForLoggedInUser(user) {
  const loginLink = document.getElementById("loginLink")
  const registerLink = document.getElementById("registerLink")
  const userInfo = document.getElementById("userInfo")
  const username = document.getElementById("username")

  if (loginLink) loginLink.style.display = "none"
  if (registerLink) registerLink.style.display = "none"
  if (userInfo) userInfo.style.display = "inline-block"
  if (username) username.textContent = user.username

  const logoutBtn = document.getElementById("logoutBtn")
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout)
  }
}

function updateNavForLoggedOutUser() {
  const loginLink = document.getElementById("loginLink")
  const registerLink = document.getElementById("registerLink")
  const userInfo = document.getElementById("userInfo")

  if (loginLink) loginLink.style.display = "inline-block"
  if (registerLink) registerLink.style.display = "inline-block"
  if (userInfo) userInfo.style.display = "none"
}

async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/"
  } catch (error) {
    console.error("Error logging out:", error)
  }
}

document.addEventListener("DOMContentLoaded", checkAuthStatus)
