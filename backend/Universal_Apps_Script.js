/**
 * EcoLedger Universal Apps Script
 *
 * INSTRUCTIONS:
 * 1. Open your Google Sheet.
 * 2. Create the following tabs (sheets) EXACTLY as named:
 *    - Users
 *    - Companies
 *    - Assignments
 *    - Uploads
 *    - Payments
 * 3. Go to Extensions > Apps Script.
 * 4. Paste ALL of this code into the editor, replacing any existing code.
 * 5. Click Save.
 * 6. Click Deploy > New deployment.
 * 7. Select type: Web App.
 * 8. Execute as: Me. Who has access: Anyone.
 * 9. Click Deploy. (Authorize if prompted).
 * 10. Copy the Web App URL and paste it into ALL url variables in your backend .env file.
 */

function doPost(e) {
  try {
    var sheetDb = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var type = payload.type;
    var data = payload.data || {};

    if (type === "register_company") {
      var sheet = sheetDb.getSheetByName("Companies");
      if (!sheet) return jsonResponse({ ok: false, reason: "Sheet 'Companies' not found" });
      
      sheet.appendRow([
        new Date().toISOString(),
        data.company_name || "",
        data.gstin || "",
        data.company_email || "",
        data.company_phone || "",
        data.authorized_person || "",
        data.company_address || ""
      ]);
      return jsonResponse({ ok: true });
    }

    if (type === "register_user") {
      var sheet = sheetDb.getSheetByName("Users");
      if (!sheet) return jsonResponse({ ok: false, reason: "Sheet 'Users' not found" });
      
      sheet.appendRow([
        new Date().toISOString(),
        data.full_name || "",
        data.phone || data.identifier || "",
        data.password ? "[set]" : ""
      ]);
      return jsonResponse({ ok: true });
    }

    if (type === "append_assignment") {
      var sheet = sheetDb.getSheetByName("Assignments");
      if (!sheet) return jsonResponse({ ok: false, reason: "Sheet 'Assignments' not found" });
      
      sheet.appendRow([
        new Date().toISOString(),
        data.company_name || "",
        data.user_id || "",
        "", // <--- This is where the Admin will type the Key
        data.full_name || ""  // col E: picker's real name for easy display
      ]);
      return jsonResponse({ ok: true });
    }

    if (type === "lookup_assigned_key") {
      var sheet = sheetDb.getSheetByName("Assignments");
      if (!sheet) return jsonResponse({ ok: false, reason: "Sheet 'Assignments' not found" });
      
      var rows = sheet.getDataRange().getValues();
      var assignedKey = payload.assigned_key || "";
      var role = payload.role; // "company" or "waste_picker"
      
      for (var i = 1; i < rows.length; i++) {
        var rowCompany = rows[i][1];
        var rowUserId  = rows[i][2];
        var rowKey     = rows[i][3]; // Column D — key typed by admin
        var rowName    = rows[i][4]; // Column E — full_name stored at registration
        
        if (rowKey && rowKey.toString().trim() === assignedKey.toString().trim()) {
           if (role === "company" && rowCompany) {
             return jsonResponse({ ok: true, found: true, data: { id: assignedKey, company_name: rowCompany, verifying_id: rowKey } });
           } else if (role === "waste_picker" && rowUserId) {
             // Try col E (full_name) first; fall back to cross-referencing Users sheet
             var displayName = rowName ? rowName.toString().trim() : "";
             if (!displayName) {
               var usersSheet = sheetDb.getSheetByName("Users");
               if (usersSheet) {
                 var uRows = usersSheet.getDataRange().getValues();
                 for (var u = 1; u < uRows.length; u++) {
                   // Users sheet: col B = full_name, col C = phone/identifier
                   if (uRows[u][2] && uRows[u][2].toString().trim() === rowUserId.toString().trim()) {
                     displayName = uRows[u][1] ? uRows[u][1].toString().trim() : "";
                     break;
                   }
                 }
               }
             }
             return jsonResponse({ ok: true, found: true, data: { id: assignedKey, user_id: rowUserId, full_name: displayName || rowUserId, verifying_id: rowKey } });
           } else if (role === "agent" && rowUserId) {
             // Agents can be stored in the Assignments sheet as well:
             // - Column C (user_id) = agent_id
             // - Column E (full_name) = agent name (optional)
             var agentName = rowName ? rowName.toString().trim() : "";
             return jsonResponse({ ok: true, found: true, data: { id: assignedKey, agent_id: rowUserId, full_name: agentName || rowUserId, verifying_id: rowKey } });
           }
        }
      }
      return jsonResponse({ ok: true, found: false });
    }
    
    if (type === "lookup") {
      var role = payload.role;
      var identifier = payload.identifier || "";
      var sheetName = role === "company" ? "Companies" : "Users";
      var sheet = sheetDb.getSheetByName(sheetName);
      if (!sheet) return jsonResponse({ ok: false, reason: "Sheet '" + sheetName + "' not found" });

      var rows = sheet.getDataRange().getValues();
      var idCol = role === "company" ? 3 : 2; // Email for company, Identifier for user
      var nameCol = role === "company" ? 1 : 1;
      
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][idCol] && rows[i][idCol].toString().trim() === identifier.toString().trim()) {
          // Find their verifying_id from Assignments
          var assignSheet = sheetDb.getSheetByName("Assignments");
          var assignRows = assignSheet ? assignSheet.getDataRange().getValues() : [];
          var v_id = null;
          for (var j = 1; j < assignRows.length; j++) {
            if (role === "company" && assignRows[j][1] === rows[i][nameCol]) v_id = assignRows[j][3];
            if (role === "waste_picker" && assignRows[j][2] === rows[i][idCol]) v_id = assignRows[j][3];
          }
          
          return jsonResponse({
            ok: true, found: true,
            data: { id: identifier, name: rows[i][nameCol], role: role, verifying_id: v_id }
          });
        }
      }
      return jsonResponse({ ok: true, found: false });
    }

    if (type === "list_companies") {
      var sheet = sheetDb.getSheetByName("Companies");
      if (!sheet) return jsonResponse({ companies: [] });
      var rows = sheet.getDataRange().getValues();
      var companies = [];
      for (var i = 1; i < rows.length; i++) {
        companies.push({ id: rows[i][3], name: rows[i][1] });
      }
      return jsonResponse({ companies: companies });
    }

    if (type === "create_upload") {
      var sheet = sheetDb.getSheetByName("Uploads");
      if (!sheet) return jsonResponse({ ok: false, reason: "Sheet 'Uploads' not found" });
      sheet.appendRow([
        data.upload_id,
        data.picker_user_id,
        data.company_id,
        data.image_url,
        data.plastic_type,
        data.weight,
        data.status,
        data.created_at,
        data.agent_id || ""
      ]);
      return jsonResponse({ ok: true });
    }

    if (type === "get_agent_stats") {
      var sheet = sheetDb.getSheetByName("Uploads");
      if (!sheet) return jsonResponse({ today_collections: 0, total_plastic_kg: 0 });
      
      var rows = sheet.getDataRange().getValues();
      var agentId = payload.agent_id;
      var countToday = 0;
      var totalKg = 0;
      
      var today = new Date();
      var todayStr = today.getFullYear() + "-" + (today.getMonth() + 1).toString().padStart(2, '0') + "-" + today.getDate().toString().padStart(2, '0');
      
      for (var i = 1; i < rows.length; i++) {
        var rowAgentId = rows[i][8]; // Column I
        var rowWeight = rows[i][5];  // Column F
        var rowDate = rows[i][7];    // Column H
        
        if (rowAgentId && rowAgentId.toString().trim() === agentId.toString().trim()) {
          // Add to total
          var w = 0;
          if (rowWeight) {
            w = parseFloat(rowWeight.toString().replace(/[^0-9.]/g, '')) || 0;
          }
          totalKg += w;
          
          // Check if today
          if (rowDate) {
            var rowDateStr = "";
            if (rowDate instanceof Date) {
              rowDateStr = rowDate.getFullYear() + "-" + (rowDate.getMonth() + 1).toString().padStart(2, '0') + "-" + rowDate.getDate().toString().padStart(2, '0');
            } else {
              rowDateStr = rowDate.toString();
            }
            
            if (rowDateStr.startsWith(todayStr)) {
              countToday++;
            }
          }
        }
      }
      return jsonResponse({ 
        agent_id: agentId, 
        today_collections: countToday, 
        total_plastic_kg: parseFloat(totalKg.toFixed(2)) 
      });
    }

    if (type === "get_company_uploads") {
      var sheet = sheetDb.getSheetByName("Uploads");
      if (!sheet) return jsonResponse({ company_id: payload.company_id, uploads: [] });
      
      var rows = sheet.getDataRange().getValues();
      var uploads = [];
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][2] === payload.company_id && (payload.status === "all" || rows[i][6] === payload.status)) {
          uploads.push({
            upload_id: rows[i][0],
            picker_user_id: rows[i][1],
            plastic_type: rows[i][4],
            weight: rows[i][5],
            status: rows[i][6],
            created_at: rows[i][7]
          });
        }
      }
      return jsonResponse({ company_id: payload.company_id, uploads: uploads });
    }

    if (type === "update_upload_status") {
      var sheet = sheetDb.getSheetByName("Uploads");
      if (!sheet) return jsonResponse({ ok: false });
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === payload.upload_id) {
          sheet.getRange(i + 1, 7).setValue(payload.status);
          return jsonResponse({ ok: true });
        }
      }
      return jsonResponse({ ok: false, reason: "Upload not found" });
    }

    if (type === "process_payment") {
      var sheet = sheetDb.getSheetByName("Payments");
      if (!sheet) return jsonResponse({ ok: false, reason: "Sheet 'Payments' not found" });
      sheet.appendRow([
        data.tx_id,
        data.upload_id,
        data.picker_user_id,
        data.company_id,
        data.amount,
        data.status,
        data.paid_at
      ]);
      return jsonResponse({ ok: true });
    }

    if (type === "get_picker_payments") {
      var sheet = sheetDb.getSheetByName("Payments");
      if (!sheet) return jsonResponse({ payments: [] });
      var rows = sheet.getDataRange().getValues();
      var payments = [];
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][2] === payload.picker_id) {
          payments.push({
            payment_id: rows[i][0],
            upload_id: rows[i][1],
            picker_user_id: rows[i][2],
            company_id: rows[i][3],
            amount: rows[i][4],
            status: rows[i][5],
            paid_at: rows[i][6]
          });
        }
      }
      return jsonResponse({ payments: payments });
    }

    if (type === "get_picker_tokens") {
      var sheet = sheetDb.getSheetByName("Uploads");
      if (!sheet) return jsonResponse({ tokens: [] });
      var rows = sheet.getDataRange().getValues();
      var tokens = [];
      for (var i = 1; i < rows.length; i++) {
        // Find by user_id in Column B (index 1) OR wallet in metadata if we had it
        // For now, picker_user_id is the primary ID
        if (rows[i][1] === payload.user_id && rows[i][6] === "approved") {
          tokens.push({
            token_id: "NFT-" + rows[i][0].split('_').pop(),
            plastic_type: rows[i][4],
            weight: rows[i][5] + " kg",
            eco_reward: (parseFloat(rows[i][5])*18).toFixed(1) + " ECO",
            minted_at: rows[i][7],
            explorer_url: "",
            transaction_hash: ""
          });
        }
      }
      return jsonResponse({ tokens: tokens });
    }

    return jsonResponse({ ok: false, reason: "Unknown operation type: " + type });

  } catch (err) {
    return jsonResponse({ ok: false, reason: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService.createTextOutput("EcoLedger Universal Apps Script is active. Make sure to use POST requests.");
}
