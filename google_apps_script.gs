/**
 * MedSafety Pro - Google Apps Script Webhook
 * 
 * Fungsi:
 * 1. Merekod laporan kesilapan pengubatan ke Google Sheet secara automatik.
 * 2. Menghantar e-mel notifikasi rasmi terus kepada staf yang terlibat bersama lampiran PDF.
 * 
 * Cara Pasang / Update di Google Sheet:
 * 1. Buka fail Google Sheet backup anda.
 * 2. Klik Extensions (Sambungan) > Apps Script.
 * 3. Salin dan gantikan kod di dalam Editor (Code.gs) dengan kod ini.
 * 4. Klik ikon Save (Disket).
 * 5. Klik Deploy (Gunakan) > Manage deployments (Urus penggunaan) > Klik ikon pensel (Edit) >
 *    Tukar Version kepada "New version" (Versi baharu) > Klik Deploy!
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "No post data received"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // 1. Rekod baris data ke Google Sheet jika ada rowArray
    if (payload.rowArray && Array.isArray(payload.rowArray) && payload.rowArray.length > 0) {
      sheet.appendRow(payload.rowArray);
    }

    // 2. Hantar E-mel kepada staf jika ada emailData
    var emailSent = false;
    var emailError = null;

    if (payload.emailData && payload.emailData.to) {
      try {
        var emailTo = (payload.emailData.to || "").trim();
        var staffName = payload.emailData.staffName || "Tuan/Puan";
        var serialNumber = payload.emailData.serialNumber || "MSP";
        var facility = payload.emailData.facility || "Klinik Kesihatan";
        var incidentDate = payload.emailData.incidentDate || "-";
        var reporterName = payload.emailData.reporterName || "Pegawai Farmasi";
        var appUrl = (payload.emailData.appUrl || "https://medsafety-pro.vercel.app").replace(/\/+$/, "");
        
        var customMessage = payload.emailData.message || (
          "Assalamualaikum dan Salam Sejahtera,\n\n" +
          "Peringatan mesra. Kami dapati terdapat kesilapan pengubatan dalam preskripsi yang ditulis. " +
          "Sehubungan itu, pihak tuan diminta untuk mengemukakan maklum balas melalui aplikasi MedSafety Pro.\n\n" +
          "Terima kasih atas keprihatinan dan kerjasama tuan dalam membantu meningkatkan keselamatan pengubatan."
        );

        var subject = "[MedSafety Pro] Peringatan Maklum Balas Kesilapan Pengubatan - " + serialNumber;

        // Siapkan lampiran fail PDF jika dihantar oleh aplikasi
        var attachments = [];
        if (payload.pdfBase64 && payload.pdfBase64.length > 50) {
          try {
            var decodedPdf = Utilities.base64Decode(payload.pdfBase64);
            var filename = payload.pdfFilename || ("Laporan_" + serialNumber + ".pdf");
            var pdfBlob = Utilities.newBlob(decodedPdf, "application/pdf", filename);
            attachments.push(pdfBlob);
          } catch (pdfErr) {
            console.error("Gagal memproses lampiran PDF: " + pdfErr.toString());
          }
        }

        // Siapkan kandungan HTML e-mel yang kemas dan rasmi
        var htmlBody = 
          '<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">' +
            '<div style="background-color: #0d9488; color: white; padding: 20px; text-align: center;">' +
              '<h2 style="margin: 0; font-size: 20px;">MedSafety Pro - PKD Pasir Mas</h2>' +
              '<p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Sistem Pelaporan Kesilapan Pengubatan</p>' +
            '</div>' +
            '<div style="padding: 25px 20px;">' +
              '<p style="font-size: 15px; margin-top: 0;"><strong>Kepada: ' + staffName + '</strong>,</p>' +
              '<div style="background: #f8fafc; border-left: 4px solid #0d9488; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 15px;">' +
                '<p style="margin: 0 0 10px 0;"><strong>Assalamualaikum dan Salam Sejahtera,</strong></p>' +
                '<p style="margin: 0 0 10px 0;">Peringatan mesra. Kami dapati terdapat kesilapan pengubatan dalam preskripsi yang ditulis. Sehubungan itu, pihak tuan diminta untuk mengemukakan maklum balas melalui aplikasi MedSafety Pro.</p>' +
                '<p style="margin: 0;">Terima kasih atas keprihatinan dan kerjasama tuan dalam membantu meningkatkan keselamatan pengubatan.</p>' +
              '</div>' +
              '<h3 style="color: #334155; font-size: 16px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-top: 25px;">Ringkasan Laporan:</h3>' +
              '<table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px;">' +
                '<tr style="background-color: #f8fafc;"><td style="padding: 8px 12px; font-weight: bold; width: 35%; border: 1px solid #e2e8f0;">No. Siri:</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-family: monospace; font-weight: bold; color: #0d9488;">' + serialNumber + '</td></tr>' +
                '<tr><td style="padding: 8px 12px; font-weight: bold; border: 1px solid #e2e8f0;">Fasiliti:</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">' + facility + '</td></tr>' +
                '<tr style="background-color: #f8fafc;"><td style="padding: 8px 12px; font-weight: bold; border: 1px solid #e2e8f0;">Tarikh Kejadian:</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">' + incidentDate + '</td></tr>' +
                '<tr><td style="padding: 8px 12px; font-weight: bold; border: 1px solid #e2e8f0;">Pegawai Pelapor:</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">' + reporterName + '</td></tr>' +
                '<tr style="background-color: #f8fafc;"><td style="padding: 8px 12px; font-weight: bold; border: 1px solid #e2e8f0;">Lampiran PDF:</td><td style="padding: 8px 12px; border: 1px solid #e2e8f0;">' + (attachments.length > 0 ? "✅ Fail PDF disertakan bersama e-mel ini" : "Boleh dimuat turun di aplikasi") + '</td></tr>' +
              '</table>' +
              '<div style="text-align: center; margin: 30px 0 20px 0;">' +
                '<a href="' + appUrl + '/feedback.html" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Buka Aplikasi MedSafety Pro &amp; Beri Maklum Balas</a>' +
              '</div>' +
              '<p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">' +
                'E-mel ini dijana secara automatik oleh Sistem MedSafety Pro, Unit Farmasi PKD Pasir Mas.' +
              '</p>' +
            '</div>' +
          '</div>';

        var plainTextBody = 
          customMessage + "\n\n" +
          "------------------------------------\n" +
          "Ringkasan Laporan:\n" +
          "No. Siri: " + serialNumber + "\n" +
          "Fasiliti: " + facility + "\n" +
          "Tarikh Kejadian: " + incidentDate + "\n" +
          "Pegawai Pelapor: " + reporterName + "\n" +
          "------------------------------------\n\n" +
          "Sila layari " + appUrl + "/feedback.html untuk mengemukakan maklum balas.\n\n" +
          "Unit Farmasi, Pejabat Kesihatan Daerah Pasir Mas";

        MailApp.sendEmail({
          to: emailTo,
          subject: subject,
          body: plainTextBody,
          htmlBody: htmlBody,
          attachments: attachments,
          name: "MedSafety Pro (PKD Pasir Mas)"
        });

        emailSent = true;
      } catch (eErr) {
        emailError = eErr.toString();
        console.error("Gagal menghantar e-mel: " + emailError);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      sheetLogged: true,
      emailSent: emailSent,
      emailError: emailError
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (globalErr) {
    console.error("Webhook error: " + globalErr.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: globalErr.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("MedSafety Pro Google Apps Script Webhook is Active & Ready.");
}
