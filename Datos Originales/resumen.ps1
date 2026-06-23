# Analizar hoja RESUMEN
$excelFile = "d:\Proyectos\Excel\Datos Originales\Data_Cristina.xlsx"
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$workbook = $excel.Workbooks.Open($excelFile)

Write-Host "RESUMEN DE CONTENIDOS"
Write-Host "====================="
Write-Host ""

# Hoja RESUMEN
Write-Host "HOJA 2: RESUMEN"
$sheet2 = $workbook.Sheets(2)
Write-Host "Primeras 15 filas:"
for ($i = 1; $i -le 15; $i++) {
    $val1 = $sheet2.Cells($i, 1).Text
    $val2 = $sheet2.Cells($i, 2).Text
    $val3 = $sheet2.Cells($i, 3).Text
    if ($val1 -or $val2 -or $val3) {
        Write-Host "  Fila $i : $val1 | $val2 | $val3"
    }
}

Write-Host ""
Write-Host "HOJA 3: Plan de ejecucion"
$sheet4 = $workbook.Sheets(4)
Write-Host "Encabezados:"
for ($i = 1; $i -le 10; $i++) {
    $val = $sheet4.Cells(1, $i).Text
    if ($val) {
        Write-Host "  Col $i : $val"
    }
}

Write-Host ""
Write-Host "Primeras 5 filas de datos:"
for ($row = 2; $row -le 6; $row++) {
    $data = ""
    for ($col = 1; $col -le 5; $col++) {
        $val = $sheet4.Cells($row, $col).Text
        $data += "$val | "
    }
    Write-Host "  Fila $row : $data"
}

$workbook.Close($false)
$excel.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null

Write-Host ""
Write-Host "Análisis completado."
