import React from "react";
import { PDFViewer, Document, Page } from "@react-pdf/renderer";

const PDFPreview = ({ pdfPath }) => {
  return <iframe src={pdfPath} width="800" height="1200" ></iframe>;
};

export default PDFPreview;
