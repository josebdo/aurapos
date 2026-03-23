// jspdf and jspdf-autotable are imported dynamically inside the function to avoid SSR/Turbopack issues

import { format } from "date-fns"

interface TicketData {
  business: {
    name: string
    rnc?: string
    phone?: string
    address?: string
    email?: string
    logo_url?: string
    footer?: string
  }
  sale: {
    number: string
    date: Date
    ncf?: string
    ncf_type_name?: string
    subtotal: number
    discount: number
    total: number
    total_bs?: number
    exchange_rate: number
    payment_method: string
    isDopBase?: boolean
  }
  items: Array<{
    name: string
    quantity: number
    price: number
    total: number
  }>
}

export const generateTicketPDF = async (data: TicketData) => {
  // @ts-ignore - Forcing the browser-specific ES module distribution to avoid Node-specific fflate issues in Turbopack
  const { jsPDF } = await import("jspdf/dist/jspdf.es.min.js")
  // @ts-ignore - load autotable which we'll use as a function
  const autoTable = (await import("jspdf-autotable")).default

  const doc = new jsPDF({
    unit: "mm",
    format: [80, 200], // 80mm thermal paper
  })

  const margin = 5
  let y = 10

  // Header - Business Name
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text(data.business.name.toUpperCase(), 40, y, { align: "center" })
  y += 5

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  
  if (data.business.rnc) {
    doc.text(`RNC: ${data.business.rnc}`, 40, y, { align: "center" })
    y += 4
  }
  
  if (data.business.address) {
    const splitAddress = doc.splitTextToSize(data.business.address, 70)
    doc.text(splitAddress, 40, y, { align: "center" })
    y += (splitAddress.length * 4)
  }

  if (data.business.phone) {
    doc.text(`Tel: ${data.business.phone}`, 40, y, { align: "center" })
    y += 4
  }

  y += 2
  doc.line(margin, y, 80 - margin, y)
  y += 5

  // Sale Info
  doc.setFont("helvetica", "bold")
  doc.text(`FACTURA: ${data.sale.number}`, margin, y)
  y += 4
  
  if (data.sale.ncf) {
    doc.text(`NCF: ${data.sale.ncf}`, margin, y)
    y += 4
    if (data.sale.ncf_type_name) {
      doc.setFont("helvetica", "normal")
      doc.text(`Tipo: ${data.sale.ncf_type_name}`, margin, y)
      y += 4
    }
  }

  doc.setFont("helvetica", "normal")
  doc.text(`Fecha: ${format(data.sale.date, "dd/MM/yyyy HH:mm")}`, margin, y)
  y += 4
  doc.text(`Pago: ${data.sale.payment_method.toUpperCase()}`, margin, y)
  y += 5

  // Items Table
  // @ts-ignore - call autotable directly
  autoTable(doc, {
    startY: y,
    head: [['Cant', 'Desc', 'Precio', 'Total']],
    body: data.items.map(item => [
        item.quantity,
        item.name,
        item.price.toFixed(2),
        item.total.toFixed(2)
    ]),
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 1 },
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
    columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 35 },
        2: { cellWidth: 12, halign: 'right' },
        3: { cellWidth: 13, halign: 'right' }
    },
    theme: 'plain'
  })

  // @ts-ignore
  y = doc.lastAutoTable.finalY + 5

  // Totals
  const rightCol = 75
  doc.setFont("helvetica", "normal")
  doc.text("Subtotal:", 45, y)
  doc.text(data.sale.subtotal.toFixed(2), rightCol, y, { align: "right" })
  y += 4

  if (data.sale.discount > 0) {
    doc.text("Descuento:", 45, y)
    doc.text(`-${data.sale.discount.toFixed(2)}`, rightCol, y, { align: "right" })
    y += 4
  }

  doc.setFontSize(10)
  if (data.sale.isDopBase) {
    doc.setFont("helvetica", "bold")
    doc.text("TOTAL RD$:", 45, y)
    doc.text(`${data.sale.total_bs?.toFixed(2) || data.sale.total.toFixed(2)}`, rightCol, y, { align: "right" })
    y += 5
    // Optionally hide USD completely or show very small
  } else {
    doc.setFont("helvetica", "bold")
    doc.text("TOTAL USD:", 45, y)
    doc.text(`$${data.sale.total.toFixed(2)}`, rightCol, y, { align: "right" })
    y += 5

    if (data.sale.total_bs) {
      doc.text("TOTAL DOP:", 45, y)
      doc.text(`RD$ ${data.sale.total_bs.toFixed(2)}`, rightCol, y, { align: "right" })
      y += 4
      doc.setFontSize(7)
      doc.setFont("helvetica", "normal")
      doc.text(`Tasa: ${data.sale.exchange_rate.toFixed(2)}`, rightCol, y, { align: "right" })
      y += 6
    }
  }

  y += 5
  if (data.business.footer) {
    doc.setFontSize(8)
    const splitFooter = doc.splitTextToSize(data.business.footer, 70)
    doc.text(splitFooter, 40, y, { align: "center" })
    y += (splitFooter.length * 4)
  }

  doc.text("¡Gracias por su compra!", 40, y, { align: "center" })

  // Save or Print
  const pdfBlob = doc.output("blob")
  const url = URL.createObjectURL(pdfBlob)
  const win = window.open(url, "_blank")
  if (win) {
    win.focus()
    // Optional: win.print() might be triggered but it's better to let the user see the PDF first
  }
}
