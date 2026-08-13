score = float(input("Input a score between 0 and 100: "))

if score >= 0 and score <= 100:
    if score >= 90:
        print("Your grade is A.")
    elif score >= 80:
        print("Your grade is B.")
    elif score >= 70:
        print("Your grade is C.")
    elif score >= 60:
        print("Your grade is D.")
    else:
        print("Your grade is F.")
else:
    print("Invalid score! Please enter a value between 0 and 100.")