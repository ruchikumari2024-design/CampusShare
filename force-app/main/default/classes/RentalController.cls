
public with sharing class RentalController {

    @AuraEnabled
    public static Id requestRental(
        Id resourceId,
        Date startDate,
        Date endDate
    ) {
        if (resourceId == null || startDate == null ||
            endDate == null) {
            throw new AuraHandledException(
                'Please provide the resource and rental dates.'
            );
        }

        if (startDate < Date.today()) {
            throw new AuraHandledException(
                'Start date cannot be in the past.'
            );
        }

        if (endDate < startDate) {
            throw new AuraHandledException(
                'End date must be on or after the start date.'
            );
        }

        Resource__c resource = [
            SELECT Id, Name, Status__c, Listing_Type__c
            FROM Resource__c
            WHERE Id = :resourceId
            LIMIT 1
        ];

        if (resource.Status__c != 'Available') {
            throw new AuraHandledException(
                'This resource is not currently available.'
            );
        }

        if (resource.Listing_Type__c != 'Rent') {
            throw new AuraHandledException(
                'Only rental listings accept rental requests.'
            );
        }

        List<Rental_Request__c> conflicts = [
            SELECT Id
            FROM Rental_Request__c
            WHERE Resource__c = :resourceId
            AND Status__c IN (
                'Pending', 'Approved', 'Active'
            )
            AND Start_Date__c <= :endDate
            AND End_Date__c >= :startDate
            LIMIT 1
        ];

        if (!conflicts.isEmpty()) {
            throw new AuraHandledException(
                'These dates overlap with another rental request.'
            );
        }

        Rental_Request__c request = new Rental_Request__c(
            Resource__c = resourceId,
            Requester__c = UserInfo.getUserId(),
            Start_Date__c = startDate,
            End_Date__c = endDate,
            Status__c = 'Pending'
        );

        insert request;
        return request.Id;
    }

    @AuraEnabled(cacheable=true)
    public static List<Rental_Request__c> getMyRequests() {
        return [
            SELECT Id, Name, Resource__c,
                   Resource__r.Name,
                   Start_Date__c, End_Date__c,
                   Rental_Days__c, Total_Cost__c,
                   Status__c, CreatedDate
            FROM Rental_Request__c
            WHERE Requester__c = :UserInfo.getUserId()
            WITH USER_MODE
            ORDER BY CreatedDate DESC
            LIMIT 100
        ];
    }

    @AuraEnabled(cacheable=true)
    public static List<Rental_Request__c>
        getRequestsForMyResources() {

        return [
            SELECT Id, Name, Resource__c,
                   Resource__r.Name,
                   Requester__c,
                   Requester__r.Name,
                   Start_Date__c, End_Date__c,
                   Rental_Days__c, Total_Cost__c,
                   Status__c, CreatedDate
            FROM Rental_Request__c
            WHERE Resource__r.OwnerId = :UserInfo.getUserId()
            WITH USER_MODE
            ORDER BY CreatedDate DESC
            LIMIT 100
        ];
    }

    @AuraEnabled
    public static void updateRequestStatus(
        Id requestId,
        String newStatus
    ) {
        if (requestId == null ||
            !new Set<String>{
                'Approved', 'Rejected', 'Returned'
            }.contains(newStatus)) {
            throw new AuraHandledException(
                'Invalid rental request or status.'
            );
        }

        List<Rental_Request__c> requests = [
            SELECT Id, Status__c, Resource__r.OwnerId
            FROM Rental_Request__c
            WHERE Id = :requestId
            WITH USER_MODE
            LIMIT 1
        ];

        if (requests.isEmpty()) {
            throw new AuraHandledException(
                'Rental request not found or inaccessible.'
            );
        }

        Rental_Request__c request = requests[0];

        if (request.Resource__r.OwnerId != UserInfo.getUserId()) {
            throw new AuraHandledException(
                'Only the resource owner can update this request.'
            );
        }

        if (request.Status__c != 'Pending' &&
            newStatus != 'Returned') {
            throw new AuraHandledException(
                'Only pending requests can be approved or rejected.'
            );
        }

        if (newStatus == 'Returned' &&
            request.Status__c != 'Approved' &&
            request.Status__c != 'Active') {
            throw new AuraHandledException(
                'Only approved or active rentals can be returned.'
            );
        }

        request.Status__c = newStatus;
        update request;
    }
}
