import AIProcessingModal from '../../common/AIProcessingModal'
import { AlertTriangle } from 'lucide-react'
import { useStage1Data } from './hooks/useStage1Data'
import { StageHeader } from './StageHeader'
import { StatusBanner } from './StatusBanner'
import { PericopeSelector } from './PericopeSelector'
import { PreviewCard } from './PreviewCard'
import { PassageCard } from './PassageCard'
import { ExistingPassagesCard } from './ExistingPassagesCard'
import { DiscardSessionDialog } from './DiscardSessionDialog'
import { EmptyStateCard } from './EmptyStateCard'
import { warningStateStyles } from '@/styles'
import { cn } from '@/utils/cn'

function Stage1Syntax() {
    const {
        passageData,
        readOnly,
        bhsaLoaded,
        loading,
        error,
        loadingMessage,
        checkedClauses,
        toggleClauseCheck,
        isAdmin,
        showAIModal,
        setShowAIModal,
        showDiscardConfirm,
        setShowDiscardConfirm,
        existingPassages,
        duplicateWarning,
        previewData,
        isPreviewMode,
        pericopes,
        books,
        selectedBook,
        setSelectedBook,
        searchTerm,
        filterByUser,
        setFilterByUser,
        contributors,
        showDropdown,
        setShowDropdown,
        selectedPericope,
        setReference,
        handleSelectPericope,
        handleSearchTermChange,
        handleFetchPassage,
        handleStartAnalysis,
        handleCancelPreview,
        handleDiscardSession,
        handleRefetchGrouping,
        handleValidateAll,
        allClausesChecked,
        mainlineClauses,
        backgroundClauses,
        displayUnits,
        mergedUnitsCount
    } = useStage1Data()

    return (
        <div className="space-y-6">
            <StageHeader bhsaLoaded={bhsaLoaded} />

            <StatusBanner readOnly={readOnly} error={error} loadingMessage={loadingMessage} />

            {!readOnly && (
                <PericopeSelector
                    books={books}
                    selectedBook={selectedBook}
                    onBookChange={setSelectedBook}
                    contributors={contributors}
                    filterByUser={filterByUser}
                    onFilterByUserChange={setFilterByUser}
                    searchTerm={searchTerm}
                    onSearchTermChange={handleSearchTermChange}
                    pericopes={pericopes}
                    selectedPericope={selectedPericope}
                    onSelectPericope={handleSelectPericope}
                    onFetchPassage={handleFetchPassage}
                    loading={loading}
                    bhsaLoaded={bhsaLoaded}
                    showDropdown={showDropdown}
                    onShowDropdownChange={setShowDropdown}
                />
            )}

            {duplicateWarning && !passageData && !isPreviewMode && (
                <div className={cn(warningStateStyles.banner, 'flex items-center gap-2 animate-in fade-in')}>
                    <AlertTriangle className="w-4 h-4" />
                    {duplicateWarning}
                </div>
            )}

            {isPreviewMode && previewData && !passageData && (
                <PreviewCard
                    previewData={previewData}
                    loading={loading}
                    onCancel={handleCancelPreview}
                    onStartAnalysis={handleStartAnalysis}
                />
            )}

            {existingPassages.length > 0 && !passageData && !isPreviewMode && (
                <ExistingPassagesCard
                    passages={existingPassages}
                    onSelectReference={setReference}
                />
            )}

            {passageData && (
                <PassageCard
                    reference={passageData.reference}
                    clauses={passageData.clauses || []}
                    displayUnits={displayUnits}
                    mainlineCount={mainlineClauses.length}
                    backgroundCount={backgroundClauses.length}
                    mergedUnitsCount={mergedUnitsCount}
                    checkedClauses={checkedClauses}
                    toggleClauseCheck={toggleClauseCheck}
                    readOnly={readOnly}
                    isAdmin={isAdmin}
                    loading={loading}
                    bhsaLoaded={bhsaLoaded}
                    allClausesChecked={allClausesChecked}
                    onRefetchGrouping={handleRefetchGrouping}
                    onDiscardSession={() => setShowDiscardConfirm(true)}
                    onValidateAll={handleValidateAll}
                    onShowAIModal={() => setShowAIModal(true)}
                />
            )}

            {!passageData && !isPreviewMode && bhsaLoaded && <EmptyStateCard />}

            <AIProcessingModal
                isOpen={showAIModal}
                onClose={() => setShowAIModal(false)}
            />

            <DiscardSessionDialog
                open={showDiscardConfirm}
                onOpenChange={setShowDiscardConfirm}
                onConfirm={handleDiscardSession}
            />
        </div>
    )
}

export default Stage1Syntax
