require('../scripts/typescript.cjs')
for (const [path, name] of [
    ['./domain/AccountingSpec.ts', 'AccountingSpec'], ['./event-prepare/BatchSpec.ts', 'BatchSpec'],
    ['./domain/CatalogSpec.ts', 'CatalogSpec'],
    ['./storage/StorageSpec.ts', 'StorageSpec'], ['./event-sync/CollaborationSpec.ts', 'CollaborationSpec'],
    ['./event-store/RelaySpec.ts', 'RelaySpec'],
    ['./architecture/ArchitectureSpec.ts', 'ArchitectureSpec'],
    ['./application/TransactionalInteractorSpec.ts', 'TransactionalInteractorSpec'],
    ['./application/RepositorySpec.ts', 'RepositorySpec'],
    ['./application/DiningSessionInteractorSpec.ts', 'DiningSessionInteractorSpec'],
    ['./application/CategoryDiningSpec.ts', 'CategoryDiningSpec'],
]) require(path)[name].verify()
