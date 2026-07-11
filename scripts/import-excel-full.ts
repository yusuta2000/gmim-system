import openpyxl from 'openpyxl'
import glob from 'glob'
import sys from 'sys'
import os from 'os'

# Add project root to path
sys.path.insert(0, '/home/z/my-project')

if not os.environ.get('DATABASE_URL'):
    raise RuntimeError('DATABASE_URL environment variable is required')
if not os.environ.get('DIRECT_URL'):
    raise RuntimeError('DIRECT_URL environment variable is required')

from prisma import Prisma

async def main():
    db = Prisma()
    await db.connect()
    
    # Find Excel file
    files = glob.glob('/home/z/my-project/upload/*.xlsx')
    fpath = [f for f in files if '09.06' in f][0]
    print(f"Dosya: {fpath.split('/')[-1]}")
    
    wb = openpyxl.load_workbook(fpath, data_only=True)
    
    # ==========================================
    # 1. CLEAR EXISTING DATA (fresh import)
    # ==========================================
    print("\n🧹 Mevcut veriler temizleniyor...")
    await db.notification.delete_many()
    await db.examSupervisor.delete_many()
    await db.exam.delete_many()
    await db.weeklySchedule.delete_many()
    await db.permanentDuty.delete_many()
    await db.task.delete_many()
    await db.pointCategory.delete_many()
    await db.importLog.delete_many()
    await db.researchAssistant.delete_many()
    print("  Temizlendi!")
    
    # ==========================================
    # 2. AR.GÖR BİLGİLERİ
    # ==========================================
    print("\n👤 Araş görler ekleniyor...")
    ws_info = wb['Ar.Gör. Bilgileri']
    
    # Read info
    info_map = {}
    for row in ws_info.iter_rows(min_row=2, max_row=ws_info.max_row, values_only=True):
        if row[2]:  # Name exists
            name = str(row[2]).strip()
            info_map[name] = {
                'faculty': str(row[0]) if row[0] else 'DZ',
                'department': str(row[1]) if row[1] else 'GMI',
                'phone': str(row[3]) if row[3] else None,
                'email': str(row[4]) if row[4] else None,
            }
    
    # TOPLAM page - get current points and order
    ws_toplam = wb['TOPLAM']
    points_map = {}
    order_list = []
    for row in ws_toplam.iter_rows(min_row=2, max_row=12, values_only=True):
        if row[1]:  # Name
            name = str(row[1]).strip()
            points_map[name] = int(row[2]) if row[2] else 0
            order_list.append(name)
    
    # Passwords for each person
    passwords = {
        'Begüm DOGANAY': 'begum2026',
        'Y.Tarık MUTLU': 'tarik2026',
        'Fatih NACAR': 'fatih2026',
        'Samet BİÇEN': 'samet2026',
        'Merve GÜL ÇIVGIN': 'merve2026',
        'Sinan COŞKUN': 'sinan2026',
        'Rukiye GÜLMEZ': 'rukiye2026',
        'Muhittin ORHAN': 'muhittin2026',
        'Cenk KAYA': 'cenk2026',
        'Ö. Berkehan İNAL': 'berkehan2026',
        'Ö. Berkehan İnal': 'berkehan2026',
    }
    
    # Admin roles
    admins = ['Begüm DOGANAY', 'Y.Tarık MUTLU']
    
    # Inactive people (yurt dışında)
    inactive = ['Ö. Berkehan İNAL', 'Ö. Berkehan İnal', 'Muhittin ORHAN']
    
    # Create assistants
    name_to_id = {}
    for idx, name in enumerate(order_list):
        info = info_map.get(name, {})
        email = info.get('email') or f"{name.lower().replace(' ', '.').replace('ö','o').replace('ü','u').replace('ı','i').replace('ş','s').replace('ç','c').replace('ğ','g')}@itu.edu.tr"
        
        # Try to find email from info_map with fuzzy matching
        if not info.get('email'):
            for key, val in info_map.items():
                if name.lower().replace(' ', '').replace('.','').replace('ö','o').replace('ü','u') in key.lower().replace(' ', '').replace('.','').replace('ö','o').replace('ü','u'):
                    email = val.get('email', email)
                    break
        
        is_active = name not in inactive
        role = 'admin' if name in admins else 'user'
        
        ra = await db.researchassistant.create(data={
            'name': name,
            'email': email,
            'phone': info.get('phone'),
            'faculty': info.get('faculty', 'DZ'),
            'department': info.get('department', 'GMI'),
            'totalPoints': points_map.get(name, 0),
            'order': idx + 1,
            'isActive': is_active,
            'role': role,
            'password': passwords.get(name, 'argor2026'),
        })
        name_to_id[name] = ra.id
        status = "🔴 PASİF" if not is_active else ("👑 Admin" if role == 'admin' else "")
        print(f"  {name}: {points_map.get(name, 0)} puan {status}")
    
    # ==========================================
    # 3. PUAN BAREMİ
    # ==========================================
    print("\n🏆 Puan baremi ekleniyor...")
    ws_barem = wb['Puan Baremi']
    cat_name_to_id = {}
    
    for row in ws_barem.iter_rows(min_row=1, max_row=55, values_only=True):
        name = row[0]
        points_raw = row[1] if len(row) > 1 else None
        
        if name and points_raw:
            name = str(name).strip()
            if 'Puanlama Sistemi' in name or not name:
                continue
            
            # Parse points
            points = 0
            if isinstance(points_raw, (int, float)):
                points = int(points_raw)
            elif isinstance(points_raw, str):
                nums = [int(s) for s in points_raw.split() if s.isdigit()]
                if nums:
                    points = nums[0]
            
            if points > 0 and name:
                cat = await db.pointcategory.create(data={
                    'name': name,
                    'points': points,
                })
                cat_name_to_id[name.lower()] = cat.id
                print(f"  {name}: {points} puan")
    
    # ==========================================
    # 4. PERSONEL SAYFALARINDAN GÖREVLERİ AKTAR
    # ==========================================
    print("\n📋 Kişisel görevler aktarılıyor...")
    
    person_sheets = ['Begüm DOGANAY', 'Fatih NACAR', 'Y.Tarık MUTLU', 'Merve GÜL ÇIVGIN', 
                     'Samet BİÇEN', 'Sinan COŞKUN', 'Rukiye GÜLMEZ', 'Cenk KAYA', 
                     'Berkehan İNAL', 'Muhittin ORHAN']
    
    total_tasks = 0
    
    for sheet_name in person_sheets:
        if sheet_name not in wb.sheetnames:
            continue
        
        ws = wb[sheet_name]
        
        # Find assistant ID
        assistant_id = None
        for name, aid in name_to_id.items():
            if sheet_name.lower().replace(' ', '') in name.lower().replace(' ', '').replace('.', ''):
                assistant_id = aid
                break
            if name.lower().replace(' ', '').replace('.', '') in sheet_name.lower().replace(' ', ''):
                assistant_id = aid
                break
        
        if not assistant_id:
            print(f"  ⚠️ {sheet_name} için araş gör bulunamadı")
            continue
        
        # Read tasks (columns: A=Sayı, B=Görev, C=Saat, D=Tarih, E=Puan)
        task_count = 0
        for row in ws.iter_rows(min_row=2, max_row=ws.max_row, values_only=True):
            num = row[0]  # Sayı
            desc = row[1] if len(row) > 1 else None  # Görev
            hours = row[2] if len(row) > 2 else None  # Saat
            date = row[3] if len(row) > 3 else None  # Tarih
            points = row[4] if len(row) > 4 else None  # Puan
            
            if not desc and not date:
                continue
            
            desc = str(desc).strip() if desc else ''
            if not desc:
                continue
            
            # Parse date
            date_val = None
            if isinstance(date, str):
                try:
                    import datetime
                    parts = date.split('.')
                    if len(parts) == 3:
                        date_val = datetime.datetime(int(parts[2]), int(parts[1]), int(parts[0]))
                except:
                    pass
            elif hasattr(date, 'year'):
                date_val = date
            
            if not date_val:
                import datetime
                date_val = datetime.datetime(2025, 7, 1)
            
            # Parse points
            p = int(points) if isinstance(points, (int, float)) and points else 0
            
            # Parse hours
            h = str(hours) if hours else None
            
            # Find category
            cat_id = None
            desc_lower = desc.lower()
            for cat_name, cid in cat_name_to_id.items():
                if cat_name in desc_lower:
                    cat_id = cid
                    break
            
            try:
                await db.task.create(data={
                    'number': int(num) if isinstance(num, (int, float)) and num else task_count + 1,
                    'description': desc,
                    'hoursWorked': h,
                    'date': date_val,
                    'points': p,
                    'status': 'approved',
                    'source': 'import',
                    'assistantId': assistant_id,
                    'categoryId': cat_id,
                })
                task_count += 1
            except Exception as e:
                print(f"    ⚠️ Hata: {e}")
        
        total_tasks += task_count
        print(f"  {sheet_name}: {task_count} görev")
    
    # ==========================================
    # 5. DAİMİ GÖREVLER
    # ==========================================
    print("\n📌 Daimi görevler aktarılıyor...")
    ws_genel = wb['Genel Görevler']
    
    current_person = None
    current_person_id = None
    duty_order = 0
    
    for row in ws_genel.iter_rows(min_row=2, max_row=ws_genel.max_row, values_only=True):
        # Column A: Person name, Column B: Duty
        name_raw = row[0] if len(row) > 0 else None
        duty = row[1] if len(row) > 1 else None
        
        if name_raw and str(name_raw).strip():
            name = str(name_raw).strip()
            # Find person ID
            for n, aid in name_to_id.items():
                if name.lower().replace(' ', '') in n.lower().replace(' ', '').replace('.', ''):
                    current_person_id = aid
                    current_person = n
                    duty_order = 0
                    break
        
        if duty and current_person_id:
            duty_str = str(duty).strip()
            if duty_str and not duty_str.startswith('Ad-Soyadı'):
                duty_order += 1
                try:
                    await db.permanentduty.create(data={
                        'name': duty_str,
                        'order': duty_order,
                        'assistantId': current_person_id,
                    })
                except:
                    pass
    
    print(f"  Daimi görevler eklendi")
    
    # ==========================================
    # 6. HAFTALIK PROGRAM
    # ==========================================
    print("\n📅 Haftalık program aktarılıyor...")
    ws_prog = wb['Haftalık Program']
    
    day_map = {'PAZARTESİ': 1, 'SALI': 2, 'ÇARŞAMBA': 3, 'PERŞEMBE': 4, 'CUMA': 5}
    day_names = list(day_map.keys())
    
    for row in ws_prog.iter_rows(min_row=3, max_row=ws_prog.max_row, values_only=False):
        name_cell = row[0].value
        if not name_cell:
            continue
        name = str(name_cell).strip()
        
        # Find assistant
        assistant_id = None
        for n, aid in name_to_id.items():
            if name.lower().replace(' ', '') in n.lower().replace(' ', '').replace('.', ''):
                assistant_id = aid
                break
            if n.lower().replace(' ', '').replace('.', '') in name.lower().replace(' ', ''):
                assistant_id = aid
                break
        
        if not assistant_id:
            continue
        
        # Check each day
        for col_idx, day_name in enumerate(day_names):
            cell_val = row[col_idx + 1].value if col_idx + 1 < len(row) else None
            if cell_val and str(cell_val).strip():
                desc = str(cell_val).strip()
                # Try to extract time
                time_slot = desc  # Just use the whole description
                
                try:
                    await db.weeklyschedule.create(data={
                        'dayOfWeek': day_map[day_name],
                        'timeSlot': time_slot,
                        'description': desc,
                        'assistantId': assistant_id,
                    })
                except:
                    pass
    
    print(f"  Haftalık program eklendi")
    
    # ==========================================
    # SUMMARY
    # ==========================================
    final_count = await db.researchassistant.count()
    task_count = await db.task.count()
    cat_count = await db.pointcategory.count()
    
    print(f"\n✅ AKTARIM TAMAMLANDI!")
    print(f"  Araş Gör: {final_count}")
    print(f"  Görevler: {task_count}")
    print(f"  Kategoriler: {cat_count}")
    
    await db.disconnect()

import asyncio
asyncio.run(main())
