// ============================================================
// EduConnect API Client
// Backend: http://localhost:5000/api/v1
// ============================================================

// ============================================================
// SECURITY: HTML-escape any user-supplied text before inserting
// it into innerHTML. Course titles/descriptions, module/material
// titles, and similar fields are entered by tutors and must never
// be trusted as raw HTML.
// ============================================================

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const API_BASE_URL = "http://localhost:5000/api/v1";

// ============================================================
// STORAGE KEYS
// ============================================================

const TOKEN_KEYS = {
  access: "educonnect_access_token",
  refresh: "educonnect_refresh_token",
  user: "educonnect_user",
};

// ============================================================
// AUTH
// ============================================================

const Auth = {
  getAccessToken: function() {
    return localStorage.getItem(TOKEN_KEYS.access);
  },
  getRefreshToken: function() {
    return localStorage.getItem(TOKEN_KEYS.refresh);
  },
  getUser: function() {
    const raw = localStorage.getItem(TOKEN_KEYS.user);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.error("Could not parse stored user:", error);
      return null;
    }
  },
  isLoggedIn: function() {
    return !!this.getAccessToken();
  },
  setSession: function({ accessToken, refreshToken, user }) {
    if (accessToken) {
      localStorage.setItem(TOKEN_KEYS.access, accessToken);
    }
    if (refreshToken) {
      localStorage.setItem(TOKEN_KEYS.refresh, refreshToken);
    }
    if (user) {
      localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(user));
    }
  },
  clearSession: function() {
    localStorage.removeItem(TOKEN_KEYS.access);
    localStorage.removeItem(TOKEN_KEYS.refresh);
    localStorage.removeItem(TOKEN_KEYS.user);
  },
  decodeAccessToken: function() {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      let payload = parts[1];
      payload = payload.replace(/-/g, "+").replace(/_/g, "/");
      while (payload.length % 4 !== 0) {
        payload += "=";
      }
      return JSON.parse(atob(payload));
    } catch (error) {
      console.error("Could not decode access token:", error);
      return null;
    }
  }
};

// ============================================================
// AUTH PROTECTION
// ============================================================

function requireAuth() {
  if (!Auth.isLoggedIn()) {
    window.location.href = "login.html";
  }
}

// ============================================================
// TOKEN REFRESH
// ============================================================

let refreshInFlight = null;

async function refreshAccessToken() {
  const refreshToken = Auth.getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token available.");
  }
  const response = await fetch(API_BASE_URL + "/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refreshToken })
  });
  const body = await response.json().catch(function() { return {}; });
  if (!response.ok) {
    Auth.clearSession();
    throw new Error(body.message || "Session expired.");
  }
  const accessToken = body.data && body.data.accessToken;
  const newRefreshToken = (body.data && body.data.refreshToken) || refreshToken;
  if (!accessToken) {
    throw new Error("Refresh response did not contain an access token.");
  }
  Auth.setSession({
    accessToken: accessToken,
    refreshToken: newRefreshToken,
    user: Auth.getUser()
  });
  return accessToken;
}

// ============================================================
// GENERIC API REQUEST
// ============================================================

async function apiFetch(path, options) {
  if (options === undefined) {
    options = {};
  }
  async function makeRequest(token) {
    var headers = { "Content-Type": "application/json" };
    if (token) {
      headers.Authorization = "Bearer " + token;
    }
    if (options.headers) {
      for (var key in options.headers) {
        if (options.headers.hasOwnProperty(key)) {
          headers[key] = options.headers[key];
        }
      }
    }
    var requestOptions = {
      method: options.method || "GET",
      headers: headers
    };
    if (options.body !== undefined && options.body !== null) {
      if (typeof options.body === "string") {
        requestOptions.body = options.body;
      } else {
        requestOptions.body = JSON.stringify(options.body);
      }
    }
    return fetch(API_BASE_URL + path, requestOptions);
  }
  var response;
  try {
    response = await makeRequest(Auth.getAccessToken());
  } catch (error) {
    console.error("API connection error:", error);
    return {
      ok: false,
      status: 0,
      message: "Unable to connect to the server.",
      error: error
    };
  }
  if (response.status === 401 && Auth.getRefreshToken()) {
    try {
      if (!refreshInFlight) {
        refreshInFlight = refreshAccessToken();
      }
      var newToken = await refreshInFlight;
      refreshInFlight = null;
      response = await makeRequest(newToken);
    } catch (error) {
      refreshInFlight = null;
      Auth.clearSession();
      window.location.href = "login.html";
      return {
        ok: false,
        status: 401,
        message: "Your session has expired.",
        error: error
      };
    }
  }
  var data = await response.json().catch(function() { return {}; });
  var result = {
    ok: response.ok,
    status: response.status
  };
  for (var key in data) {
    if (data.hasOwnProperty(key)) {
      result[key] = data[key];
    }
  }
  return result;
}

// ============================================================
// API
// ============================================================

var Api = {
  // ==========================================================
  // AUTH
  // ==========================================================
  register: function(email, password, role) {
    return apiFetch("/auth/register", {
      method: "POST",
      body: { email: email, password: password, role: role }
    });
  },
  login: function(email, password) {
    return apiFetch("/auth/login", {
      method: "POST",
      body: { email: email, password: password }
    });
  },
  getMe: function() {
    return apiFetch("/auth/me");
  },
  changePassword: function(oldPassword, newPassword) {
    return apiFetch("/auth/change-password", {
      method: "PUT",
      body: { oldPassword: oldPassword, newPassword: newPassword }
    });
  },
  logout: async function() {
    var refreshToken = Auth.getRefreshToken();
    if (refreshToken) {
      try {
        await apiFetch("/auth/logout", {
          method: "POST",
          body: { refreshToken: refreshToken }
        });
      } catch (error) {
        console.warn("Logout request failed:", error);
      }
    }
    Auth.clearSession();
  },

  forgotPassword: function(email) {
    return apiFetch("/auth/forgot-password", {
      method: "POST",
      body: { email: email }
    });
  },
  resetPassword: function(token, newPassword) {
    return apiFetch("/auth/reset-password", {
      method: "POST",
      body: { token: token, newPassword: newPassword }
    });
  },

  // ==========================================================
  // COURSES
  // ==========================================================
  getCatalog: function(params) {
    if (params === undefined) { params = {}; }
    var query = new URLSearchParams(params).toString();
    var url = "/courses/catalog";
    if (query) {
      url = url + "?" + query;
    }
    return apiFetch(url);
  },
  createCourse: function(courseData) {
    return apiFetch("/courses", {
      method: "POST",
      body: courseData
    });
  },
  updateCourse: function(courseId, courseData) {
    return apiFetch("/courses/" + courseId, {
      method: "PUT",
      body: courseData
    });
  },
  getCourseDetails: function(courseId) {
    return apiFetch("/courses/" + courseId);
  },

  // ==========================================================
  // ENROLLMENTS
  // ==========================================================
  enrollInCourse: function(courseId) {
    return apiFetch("/courses/" + courseId + "/enroll", {
      method: "POST"
    });
  },
  getEnrollmentStatus: function(courseId) {
    return apiFetch("/courses/" + courseId + "/enrollment-status");
  },

  // ==========================================================
  // TUTORS
  // ==========================================================
  getTutorProfile: function() {
    return apiFetch("/tutors/profile");
  },
  updateTutorProfile: function(data) {
    return apiFetch("/tutors/profile", {
      method: "PUT",
      body: data
    });
  },
  createSubject: function(subjectData) {
    return apiFetch("/tutors/subjects", {
      method: "POST",
      body: subjectData
    });
  },
  getTutorSubjects: function() {
    return apiFetch("/tutors/subjects");
  },
  requestCompetencyTest: function(data) {
    return apiFetch("/tutors/competency-tests", {
      method: "POST",
      body: data
    });
  },
  listCompetencyTests: function() {
    return apiFetch("/tutors/competency-tests");
  },

  // ==========================================================
  // PAYMENTS
  // ==========================================================
  initiateStkPush: function(courseId, phoneNumber) {
    return apiFetch("/payments/stk-push", {
      method: "POST",
      body: { courseId: courseId, phoneNumber: phoneNumber }
    });
  },

  // ==========================================================
  // ADMIN - TUTORS
  // ==========================================================
  getPendingTutors: function() {
    return apiFetch("/admin/tutors/pending");
  },
  verifyTutor: function(userId) {
    return apiFetch("/admin/tutors/" + userId + "/verify", {
      method: "POST"
    });
  },
  getAdminUsers: function(params) {
    if (params === undefined) { params = {}; }
    var query = new URLSearchParams(params).toString();
    var url = "/admin/users";
    if (query) {
      url = url + "?" + query;
    }
    return apiFetch(url);
  },


// ==========================================================
// ADMIN - ENROLLMENTS
// ==========================================================
getPendingEnrollments: function() {
  return apiFetch("/admin/enrollments/pending");
},
  activateEnrollment: function(enrollmentId) {
    return apiFetch("/admin/enrollments/" + enrollmentId + "/activate", {
      method: "POST"
    });
  },

  // ==========================================================
  // MODULES & MATERIALS
  // ==========================================================
  createModule: function(courseId, title, description, order) {
    return apiFetch("/courses/modules", {
      method: "POST",
      body: { courseId: courseId, title: title, description: description, order: order }
    });
  },
  createMaterial: function(moduleId, title, fileUrl, fileKey, fileType, size) {
    return apiFetch("/courses/materials", {
      method: "POST",
      body: { moduleId: moduleId, title: title, fileUrl: fileUrl, fileKey: fileKey, fileType: fileType, size: size }
    });
  },

  // ==========================================================
  // STORAGE
  // ==========================================================
  uploadFile: async function(formData) {
    try {
      var file = formData.get('file');
      var type = formData.get('type') || 'courses';
      if (!file) {
        return { ok: false, message: "No file provided" };
      }
      console.log("Uploading file:", { name: file.name, type: file.type, size: file.size });
      var metadata = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        type: type,
        mimeType: file.type
      };
      console.log("Step 1: Getting upload URL...");
      var uploadUrlResponse = await apiFetch("/storage/upload", {
        method: "POST",
        body: metadata
      });
      console.log("Upload URL response:", uploadUrlResponse);
      if (!uploadUrlResponse || !uploadUrlResponse.ok) {
        return {
          ok: false,
          message: uploadUrlResponse?.message || "Failed to get upload URL"
        };
      }
      var fileKey = uploadUrlResponse.data && uploadUrlResponse.data.fileKey;
      var uploadUrl = uploadUrlResponse.data && uploadUrlResponse.data.uploadUrl;
      var fileUrl = uploadUrlResponse.data && uploadUrlResponse.data.fileUrl;
      if (!fileKey || !uploadUrl) {
        return {
          ok: false,
          message: "Missing file key or upload URL"
        };
      }
      console.log("Step 2: Uploading file to:", uploadUrl);
var uploadFormData = new FormData();
uploadFormData.append('file', file);

var uploadResponse = await fetch(uploadUrl, {
  method: "PUT",
  body: uploadFormData,
  headers: {
    'Authorization': "Bearer " + Auth.getAccessToken()
  }
});
      console.log("Upload response status:", uploadResponse.status);
      if (!uploadResponse.ok) {
        var errorText = await uploadResponse.text();
        console.error("Upload error:", errorText);
        return {
          ok: false,
          message: "Upload failed with status: " + uploadResponse.status
        };
      }
      console.log("File uploaded successfully!");
      return {
        ok: true,
        data: {
          url: fileUrl || "http://localhost:5000/uploads/" + fileKey,
          fileKey: fileKey
        }
      };
    } catch (error) {
      console.error("Upload error:", error);
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Upload failed"
      };
    }
  }
};

// ============================================================
// DEBUG CONFIRMATION
// ============================================================

console.log("EduConnect API loaded successfully.");