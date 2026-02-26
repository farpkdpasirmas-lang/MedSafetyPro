const PDFService = {
    generatePDF: async (data, isFromAdmin = false) => {
        // Safe access to jsPDF
        if (!window.jspdf) {
            console.error('jsPDF not loaded');
            throw new Error('PDF library not loaded');
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const user = AuthService ? AuthService.getCurrentUser() : null;

        // Mapping data fields
        const date = data.date;
        const facility = data.facility || data.facility;
        const setting = data.setting;
        const detection = data.detection;
        const outcome = data.outcome;
        const staffCategory = data.staffCategory;
        const description = data.description;
        const staffName = data.staffName;
        const staffEmail = data.staffEmail;
        const reporterName = data.reporterName;
        const pharmacyErrors = data.pharmacyErrors || [];
        const clinicErrors = data.clinicErrors || [];

        // If image is attached (as base64 string directly from data object if available)
        const uploadedImageBase64 = data.imageBase64 || null;

        const pharmacyErrorString = pharmacyErrors.length > 0 ? pharmacyErrors.join(', ') : '-';
        const clinicErrorString = clinicErrors.length > 0 ? clinicErrors.join(', ') : '-';

        // Fetch Logo Base64
        const logoBase64 = await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Resize canvas properly to avoid too large images if necessary, 
                // but we just need base64.
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);

            // Adjust path depending on caller location
            img.src = isFromAdmin ? '../images/logo.png' : 'images/logo.png';
        });

        // Header - Center Logo if loaded
        if (logoBase64) {
            // approximate Malaysia state logo ratio is slightly tall
            doc.addImage(logoBase64, 'PNG', 95, 10, 20, 16);
        }

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("BAHAGIAN FARMASI", 105, 33, null, null, "center");
        doc.text("PEJABAT KESIHATAN DAERAH PASIR MAS", 105, 39, null, null, "center");

        doc.setFontSize(10);

        // Format dates
        const objDate = new Date();
        const pt1 = objDate.toLocaleDateString('en-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const pt2 = objDate.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        const formattedDate = `${pt1} ${pt2}`;

        // Metadata block
        let yPos = 52;
        doc.setFont("helvetica", "bold");
        doc.text("Kepada", 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(`: Pegawai Perubatan Y/M ${facility || '-'}`, 40, yPos);
        yPos += 7;

        doc.setFont("helvetica", "bold");
        doc.text("Daripada", 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(": Pegawai Farmasi Kesihatan Daerah", 40, yPos);
        yPos += 7;

        doc.setFont("helvetica", "bold");
        doc.text("Tarikh", 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(`: ${formattedDate}`, 40, yPos);
        yPos += 7;

        doc.setFont("helvetica", "bold");
        doc.text("Perkara", 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(": Laporan Kesilapan Pengubatan di Fasiliti Kesihatan PKD Pasir Mas", 40, yPos);
        yPos += 14;

        // Salutation & Intro
        doc.text("Dengan segala hormatnya saya diarah merujuk kepada perkara tersebut di atas.", 20, yPos);
        yPos += 7;

        const introText = doc.splitTextToSize(`2. Adalah dimaklumkan bahawa terdapat kesilapan pengubatan telah berlaku di ${facility || '-'}. Butiran laporan seperti berikut:`, 170);
        doc.text(introText, 20, yPos);
        yPos += (introText.length * 7) + 5;

        // Format event date
        let eventDateStr = date;
        if (date) {
            const edObj = new Date(date);
            if (!isNaN(edObj)) {
                const ept1 = edObj.toLocaleDateString('en-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const ept2 = edObj.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                eventDateStr = `${ept1} ${ept2}`;
            }
        }

        // Table specific
        let unitInvolved = "Kecemasan/OPD";
        if (setting === 'pharmacy') unitInvolved = "Farmasi";

        // Map outcomes and strings
        doc.autoTable({
            startY: yPos,
            body: [
                ['Unit yang terlibat', unitInvolved],
                ['Klinik', facility || '-'],
                ['Tarikh dan Masa Kejadian', eventDateStr || '-'],
                ['Pengesanan Kesilapan', detection || '-'],
                ['Nama individu yang membuat kesilapan pengubatan', `${staffName || '-'}\n${staffEmail || '-'}`],
                ['Kategori kesilapan pengubatan', outcome || '-'],
                ['Jenis kesilapan pengubatan (Kecemasan/OPD)', clinicErrorString],
                ['Jenis kesilapan pengubatan (Farmasi)', pharmacyErrorString]
            ],
            theme: 'grid',
            margin: { left: 20, right: 20 },
            bodyStyles: { lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
            columnStyles: { 0: { cellWidth: 70 } },
            styles: { font: 'helvetica', fontSize: 10 }
        });

        yPos = doc.lastAutoTable.finalY + 10;

        // Summary
        doc.setFont("helvetica", "bold");
        doc.text("Ringkasan laporan kesilapan pengubatan:", 20, yPos);
        yPos += 7;
        doc.setFont("helvetica", "normal");

        const splitDescription = doc.splitTextToSize(description || '-', 170);
        doc.text(splitDescription, 20, yPos);
        yPos += (splitDescription.length * 7) + 10;

        // Image
        doc.setFont("helvetica", "bold");
        doc.text("Gambar preskripsi/ gambar berkaitan yang menunjukkan kesilapan pengubatan", 20, yPos);
        yPos += 10;

        if (uploadedImageBase64) {
            // Check if we need a new page
            if (yPos > 180) {
                doc.addPage();
                yPos = 20;
            }

            try {
                doc.addImage(uploadedImageBase64, 'JPEG', 20, yPos, 140, 100, undefined, 'FAST');
                yPos += 110;
            } catch (e) {
                console.error("Error adding image to PDF", e);
                doc.setFont("helvetica", "normal");
                doc.text("[Gambar tidak dapat disertakan]", 20, yPos);
                yPos += 10;
            }
        } else {
            yPos += 10;
        }

        // Conclusion
        if (yPos > 210) {
            doc.addPage();
            yPos = 20;
        }

        const concText = doc.splitTextToSize("3. Sehubungan itu, mohon pihak tuan/puan menitikberatkan prosedur pengubatan supaya dapat meningkatkan lagi mutu perkhidmatan kesihatan. Segala kerjasama dan tindakan segera dari pihak tuan/puan berhubung perkara ini amatlah dihargai.", 170);
        doc.setFont("helvetica", "normal");
        doc.text(concText, 20, yPos);
        yPos += (concText.length * 4) + 10;

        doc.text("Sekian, terima kasih.", 20, yPos);
        yPos += 15;

        doc.text("Saya yang menjalankan amanah.", 20, yPos);
        yPos += 25;

        doc.text(user ? user.fullname : (reporterName || "Pegawai Farmasi"), 20, yPos);
        yPos += 5;
        doc.text("Pegawai Farmasi", 20, yPos);
        yPos += 5;
        doc.text(facility || '-', 20, yPos);
        yPos += 10;

        doc.text("b.p Pegawai Farmasi Kesihatan Daerah, PKD Pasir Mas.", 20, yPos);
        yPos += 15;

        doc.setFontSize(8);
        doc.text("**laporan dijana secara digital, tandatangan tidak diperlukan.", 20, yPos);

        const safeDate = new Date().toISOString().split('T')[0];
        doc.save(`Laporan_Kesilapan_Pengubatan_${safeDate}.pdf`);
    }
};

// Expose globally
window.PDFService = PDFService;
