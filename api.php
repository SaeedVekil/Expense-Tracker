<?php
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Get all expenses
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM expenses ORDER BY created_at DESC");
        $expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calculate statistics
        $totalExpense = $pdo->query("SELECT SUM(amount) as total FROM expenses WHERE record_type = 'expense'")->fetch();
        $totalPortfolio = $pdo->query("SELECT SUM(amount) as total FROM expenses WHERE record_type = 'portfolio'")->fetch();
        $avgPerDay = $pdo->query("SELECT AVG(amount) as avg FROM expenses WHERE record_type = 'expense' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetch();
        $topCategory = $pdo->query("SELECT category, SUM(amount) as total FROM expenses WHERE record_type = 'expense' GROUP BY category ORDER BY total DESC LIMIT 1")->fetch();
        
        echo json_encode([
            'success' => true,
            'expenses' => $expenses,
            'stats' => [
                'total' => number_format($totalExpense['total'] ?? 0, 2),
                'portfolio' => number_format($totalPortfolio['total'] ?? 0, 2),
                'avg' => number_format($avgPerDay['avg'] ?? 0, 2),
                'top' => $topCategory['category'] ?? '—'
            ]
        ]);
    } catch(PDOException $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// Add new expense
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (isset($data['title'], $data['amount'], $data['category'], $data['record_type'])) {
        try {
            $stmt = $pdo->prepare("INSERT INTO expenses (title, amount, category, record_type) VALUES (?, ?, ?, ?)");
            $stmt->execute([
                $data['title'],
                $data['amount'],
                $data['category'],
                $data['record_type']
            ]);
            
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        } catch(PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    }
}

// Delete expense
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (isset($data['id'])) {
        try {
            $stmt = $pdo->prepare("DELETE FROM expenses WHERE id = ?");
            $stmt->execute([$data['id']]);
            
            echo json_encode(['success' => true]);
        } catch(PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}
?>