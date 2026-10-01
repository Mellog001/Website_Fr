document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();

  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id');

  if (!courseId) {
    alert('No course ID specified.');
    window.location.href = 'courses.html';
    return;
  }

  const user = Auth.getUser();
  const claims = Auth.decodeAccessToken();
  const role = (user && user.role) || (claims && claims.role) || 'STUDENT';

  // Show upload form only if the user is a tutor
  if (role === 'TUTOR') {
    const tutorActions = document.getElementById('tutor-actions');
    if (tutorActions) tutorActions.style.display = 'block';
  }

  await loadCourseDetails(courseId);

  const uploadForm = document.getElementById('add-material-form');
  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await uploadMaterial(courseId);
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await Api.logout();
      window.location.href = 'login.html';
    });
  }
});

async function loadCourseDetails(courseId) {
  try {
    const result = await Api.getCourseDetails(courseId);

    if (!result || !result.ok) {
      document.getElementById('materials-list').innerHTML =
        `<p style="color: red;">${(result && result.message) || 'Error loading course.'}</p>`;
      return;
    }

    const course = result.data.course;

    document.getElementById('course-title').innerText = course.title || 'Course Details';
    document.getElementById('course-description').innerText = course.description || 'No description available.';

    renderModules(course.modules || []);
  } catch (err) {
    console.error(err);
    document.getElementById('materials-list').innerHTML =
      `<p style="color: red;">Error loading course content: ${err.message}</p>`;
  }
}

function renderModules(modules) {
  const container = document.getElementById('materials-list');

  if (!modules || modules.length === 0) {
    container.innerHTML = '<p>No modules or materials uploaded yet for this course.</p>';
    return;
  }

  container.innerHTML = modules.map(mod => `
    <div style="border: 1px solid #ddd; padding: 1rem; margin-bottom: 1rem; border-radius: 6px;">
      <h4 style="margin: 0 0 0.5rem 0;">${escapeHtml(mod.title)}</h4>
      ${(mod.materials || []).map(material => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-top: 1px solid #eee;">
          <span>${escapeHtml(material.title)}</span>
          <a href="${escapeHtml(material.file_url || material.fileUrl)}" target="_blank" download
             style="padding: 0.4rem 0.9rem; background: #28a745; color: white; text-decoration: none; border-radius: 4px; font-size: 0.85rem;">
            Download
          </a>
        </div>
      `).join('') || '<p style="color:#888; margin: 0.3rem 0 0 0;">No materials in this module yet.</p>'}
    </div>
  `).join('');
}

async function uploadMaterial(courseId) {
  const titleInput = document.getElementById('module-title');
  const fileInput = document.getElementById('material-file');
  const file = fileInput.files[0];

  if (!titleInput.value.trim()) {
    alert('Please enter a module title.');
    return;
  }
  if (!file) {
    alert('Please select a file to upload.');
    return;
  }

  const submitBtn = document.querySelector('#add-material-form button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading...';

  try {
    // Step 1: Create the module
    const moduleResult = await Api.createModule(courseId, titleInput.value.trim(), '', 1);
    if (!moduleResult || !moduleResult.ok) {
      throw new Error((moduleResult && moduleResult.message) || 'Failed to create module.');
    }
    const moduleId = moduleResult.data.id;

    // Step 2: Upload the file to storage
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'material');

    const uploadResult = await Api.uploadFile(formData);
    if (!uploadResult || !uploadResult.ok) {
      throw new Error((uploadResult && uploadResult.message) || 'File upload failed.');
    }

    // Step 3: Attach the material to the module
    const materialResult = await Api.createMaterial(
      moduleId,
      titleInput.value.trim(),
      uploadResult.data.url,
      uploadResult.data.fileKey,
      file.type,
      file.size
    );

    if (!materialResult || !materialResult.ok) {
      throw new Error((materialResult && materialResult.message) || 'Failed to save material.');
    }

    alert('Material uploaded successfully!');
    titleInput.value = '';
    fileInput.value = '';
    await loadCourseDetails(courseId);
  } catch (err) {
    console.error(err);
    alert(`Error: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Upload Material';
  }
}