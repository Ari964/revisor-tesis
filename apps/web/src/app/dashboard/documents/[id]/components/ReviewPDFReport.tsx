import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        fontSize: 10,
        lineHeight: 1.5,
        color: '#333333',
    },
    header: {
        marginBottom: 20,
        borderBottom: '2px solid #1a365d',
        paddingBottom: 10,
    },
    title: {
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
        color: '#1a365d',
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    subtitle: {
        fontSize: 10,
        color: '#4a5568',
        textAlign: 'center',
        marginTop: 5,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        color: '#2b6cb0',
        backgroundColor: '#ebf8ff',
        padding: 5,
        marginTop: 15,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    metaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 15,
    },
    metaItem: {
        width: '50%',
        marginBottom: 4,
    },
    bold: {
        fontFamily: 'Helvetica-Bold',
    },
    table: {
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#cbd5e0',
        marginBottom: 15,
    },
    tableRow: {
        flexDirection: 'row',
    },
    tableHeader: {
        backgroundColor: '#2d3748',
        color: '#ffffff',
        fontFamily: 'Helvetica-Bold',
    },
    tableCellHeader: {
        margin: 5,
        fontSize: 9,
    },
    statusBadgeError: { color: '#e53e3e', fontFamily: 'Helvetica-Bold' },
    statusBadgeSuccess: { color: '#38a169', fontFamily: 'Helvetica-Bold' },
    statusBadgeWarning: { color: '#dd6b20', fontFamily: 'Helvetica-Bold' }
});

interface ReviewReportProps {
    doc: {
        fileName: string;
        submittedAt: string;
        fileSize: number;
        overallScore?: number;
        status: string;
        findings?: Array<{
            id?: string;
            severity: string;
            category?: string;
            title: string;
            description: string;
            affectedSection?: string;
        }>;
    };
}

export const ReviewPDFReport: React.FC<ReviewReportProps> = ({ doc }) => {
    // 1. Cálculos de notas automatizados según el proyecto abierto
    const score = doc.overallScore ?? 0;
    const isApproved = score >= 11;
    const percentageScore = Math.round((score / 20) * 100);

    // 2. Contar alertas críticas del archivo en evaluación
    const criticalCount = doc.findings?.filter(f => f.severity === 'CRITICAL').length || 0;
    const majorCount = doc.findings?.filter(f => f.severity === 'MAJOR').length || 0;

    // 3. Generar un fundamento dinámico automático basado en sus errores reales
    const generateDynamicSummary = () => {
        if (criticalCount === 0 && majorCount === 0) {
            return "El proyecto de tesis satisface satisfactoriamente las pautas estructurales y metodológicas analizadas por la plataforma. No se registraron omisiones o faltas graves.";
        }
        return `El proyecto presenta un total de ${criticalCount} omisiones críticas y ${majorCount} observaciones mayores en su estructura. Requiere levantar las observaciones indicadas en la tabla técnica de hallazgos para cumplir con los estándares normativos establecidos.`;
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>

                {/* Encabezado Principal */}
                <View style={styles.header}>
                    <Text style={styles.title}>Informe de Revisión de Proyecto de Tesis</Text>
                    <Text style={styles.subtitle}>Universidad Nacional de Trujillo | Facultad de Ingeniería</Text>
                </View>

                {/* Metadatos Dinámicos Reales */}
                <View style={styles.metaGrid}>
                    <Text style={{ width: '100%', marginBottom: 6 }}>
                        <Text style={styles.bold}>Título / Archivo:</Text> {doc.fileName}
                    </Text>
                    <Text style={styles.metaItem}>
                        <Text style={styles.bold}>Tamaño de archivo:</Text> {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                    </Text>
                    <Text style={styles.metaItem}>
                        <Text style={styles.bold}>Fecha de Revisión:</Text> {doc.submittedAt ? new Date(doc.submittedAt).toLocaleDateString('es-PE') : new Date().toLocaleDateString('es-PE')}
                    </Text>
                </View>

                {/* RESUMEN EJECUTIVO DE LA EVALUACIÓN */}
                <Text style={styles.sectionTitle}>Resumen Ejecutivo de la Evaluación</Text>
                <View style={[styles.table, { width: '100%' }]}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <View style={{ width: '40%' }}><Text style={styles.tableCellHeader}>Indicador</Text></View>
                        <View style={{ width: '60%' }}><Text style={styles.tableCellHeader}>Resultado / Fundamento</Text></View>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={{ width: '40%', padding: 5 }}><Text style={styles.bold}>Estado</Text></View>
                        <View style={{ width: '60%', padding: 5 }}>
                            <Text style={isApproved ? styles.statusBadgeSuccess : styles.statusBadgeError}>
                                {isApproved ? 'SUGERIDO APROBADO' : 'NO APROBADO / REQUIERE REVISIÓN'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={{ width: '40%', padding: 5 }}><Text style={styles.bold}>Puntuación Global Estimada</Text></View>
                        <View style={{ width: '60%', padding: 5 }}><Text>{percentageScore}%</Text></View>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={{ width: '40%', padding: 5 }}><Text style={styles.bold}>Escala Vigesimal (0-20)</Text></View>
                        <View style={{ width: '60%', padding: 5 }}>
                            <Text style={styles.bold}>{doc.overallScore != null ? `${String(doc.overallScore).padStart(2, '0')}/20` : '00/20'}</Text>
                        </View>
                    </View>
                </View>

                <Text style={{ marginBottom: 15, textAlign: 'justify' }}>
                    <Text style={styles.bold}>Fundamento: </Text>
                    {generateDynamicSummary()}
                </Text>

                {/* TABLA DE VERIFICACIÓN DE ESTRUCTURA DINÁMICA */}
                <Text style={styles.sectionTitle}>Tabla de Verificación de Estructura</Text>
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <View style={{ width: '35%' }}><Text style={styles.tableCellHeader}>Sección / Subsección</Text></View>
                        <View style={{ width: '25%' }}><Text style={styles.tableCellHeader}>Estado / Severidad</Text></View>
                        <View style={{ width: '40%' }}><Text style={styles.tableCellHeader}>Observación</Text></View>
                    </View>

                    {doc.findings && doc.findings.length > 0 ? (
                        doc.findings.map((finding, idx) => (
                            <View style={styles.tableRow} key={finding.id || idx}>
                                <View style={{ width: '35%', borderRightWidth: 1, borderColor: '#cbd5e0', padding: 4 }}>
                                    <Text style={styles.bold}>{finding.affectedSection || 'General / Estructura'}</Text>
                                    {finding.category && <Text style={{ color: '#718096', fontSize: 7 }}>{finding.category}</Text>}
                                </View>
                                <View style={{ width: '25%', borderRightWidth: 1, borderColor: '#cbd5e0', padding: 4 }}>
                                    <Text style={
                                        finding.severity === 'CRITICAL' ? styles.statusBadgeError :
                                            finding.severity === 'MAJOR' ? styles.statusBadgeWarning : styles.statusBadgeSuccess
                                    }>
                                        {finding.severity === 'CRITICAL' ? '⚠️ AUSENTE / CRÍTICO' : `⚠️ ${finding.severity}`}
                                    </Text>
                                </View>
                                <View style={{ width: '40%', padding: 4 }}>
                                    <Text style={styles.bold}>{finding.title}</Text>
                                    <Text style={{ fontSize: 8, color: '#4a5568', marginTop: 2 }}>{finding.description}</Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.tableRow}>
                            <View style={{ width: '100%', padding: 10, textAlign: 'center' }}>
                                <Text style={{ color: '#38a169', fontFamily: 'Helvetica-Bold' }}>✓ ESTRUCTURA CORRECTA</Text>
                                <Text style={{ color: '#718096', fontSize: 8, marginTop: 2 }}>No se encontraron omisiones estructurales en el documento analizado.</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Firmas */}
                <View style={{ marginTop: 45, alignItems: 'flex-end' }}>
                    <View style={{ width: 200, borderTopWidth: 1, borderColor: '#718096', alignItems: 'center', paddingTop: 5 }}>
                        <Text style={styles.bold}>Comité de Evaluación</Text>
                        <Text style={{ color: '#718096', fontSize: 8 }}>Proyectos de Tesis UNT</Text>
                    </View>
                </View>

            </Page>
        </Document>
    );
};