// Facility-based Staff Autocomplete Module
// This module handles the staff name autocomplete functionality
// that filters staff based on the selected facility

function initializeStaffAutocomplete() {
    const facilitySelect = document.getElementById('facility');
    const staffNameInput = document.getElementById('staff-name');
    const staffEmailInput = document.getElementById('staff-email');
    const staffCategorySelect = document.getElementById('staff-category');
    const staffList = document.getElementById('staff-list');

    // Debug logging
    console.log('Initializing staff autocomplete...');
    console.log('Facility select:', facilitySelect);
    console.log('Staff name input:', staffNameInput);
    console.log('Staff email input:', staffEmailInput);
    console.log('Staff category select:', staffCategorySelect);
    console.log('Staff list datalist:', staffList);

    if (!facilitySelect || !staffNameInput || !staffEmailInput || !staffCategorySelect || !staffList) {
        console.error('Required elements not found for staff autocomplete');
        console.log('Missing elements - check if form has rendered');
        return false;
    }

    // Function to update staff datalist based on selected facility
    function updateStaffList() {
        // Clear existing options
        staffList.innerHTML = '';

        const selectedFacility = facilitySelect.value;
        console.log('Facility changed to:', selectedFacility);

        if (typeof STAFF_DATA !== 'undefined' && selectedFacility && STAFF_DATA[selectedFacility]) {
            const facilityStaff = STAFF_DATA[selectedFacility];
            console.log('Found', facilityStaff.length, 'staff members for', selectedFacility);

            facilityStaff.forEach(staff => {
                const option = document.createElement('option');
                option.value = staff.name;
                staffList.appendChild(option);
            });
        } else {
            console.log('No staff data found for facility:', selectedFacility);
            if (typeof STAFF_DATA === 'undefined') {
                console.error('STAFF_DATA is not defined!');
            }
        }

        // Clear staff fields when facility changes
        staffNameInput.value = '';
        staffEmailInput.value = '';
        staffCategorySelect.value = '';
    }

    // Update staff list when facility changes
    facilitySelect.addEventListener('change', updateStaffList);

    // Auto-fill logic when staff name is selected
    staffNameInput.addEventListener('input', (e) => {
        const selectedName = e.target.value;
        const selectedFacility = facilitySelect.value;

        if (typeof STAFF_DATA !== 'undefined' && selectedFacility && STAFF_DATA[selectedFacility]) {
            const staff = STAFF_DATA[selectedFacility].find(s => s.name === selectedName);
            if (staff) {
                console.log('Auto-filling staff info:', staff);
                if (staff.email) staffEmailInput.value = staff.email;
                if (staff.category) staffCategorySelect.value = staff.category;
            }
        }
    });

    console.log('Staff autocomplete initialized successfully!');
    return true;
}

// NOTE: Do NOT auto-initialize here - the form is dynamically rendered
// The initializeStaffAutocomplete() function is called manually after form renders
